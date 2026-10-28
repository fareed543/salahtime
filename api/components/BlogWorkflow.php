<?php

namespace app\components;

use app\models\BlogArticle;
use app\models\BlogArticleEvent;
use app\models\BlogArticleVersion;
use app\models\Customer;
use Yii;

/**
 * Blog article workflow shared by HttpBlogController (authors, readers) and AdminBlogController (NF-003):
 * building versions, status changes, the proposal diff, view counting and JSON shapes.
 *
 * Status flow:  draft → submitted → published | rejected | changes_proposed
 *               changes_proposed → published (author accepts) | submitted (author declines)
 * Every save adds a BlogArticleVersion; every step adds a BlogArticleEvent.
 */
class BlogWorkflow
{
    public const MAX_WAITING_PER_AUTHOR = 3;
    public const MAX_SUBMITS_PER_DAY = 5;

    /** Request field name → version attribute. */
    private const INPUT_FIELDS = [
        'title' => 'title',
        'slug' => 'slug',
        'contentHtml' => 'content_html',
        'metaTitle' => 'meta_title',
        'metaDescription' => 'meta_description',
        'focusKeyword' => 'focus_keyword',
        'category' => 'category',
        'tags' => 'tags',
        'language' => 'language',
        'coverImageUrl' => 'cover_image_url',
        'coverThumbUrl' => 'cover_thumb_url',
        'coverAlt' => 'cover_alt',
        'references' => 'references_text',
    ];

    /**
     * A new, unsaved version: $base's values overlaid with the fields present in $data, cleaned
     * and scored. Returns [version, errors]; errors is empty when the version may be saved.
     *
     * @return array{0: BlogArticleVersion, 1: array<string, string>}
     */
    public static function buildVersion(?BlogArticle $article, ?BlogArticleVersion $base, array $data, string $source, int $actorId): array
    {
        $version = new BlogArticleVersion();
        if ($base) {
            foreach (BlogArticleVersion::CONTENT_FIELDS as $field) {
                $version->$field = $base->$field;
            }
        }
        foreach (self::INPUT_FIELDS as $input => $field) {
            if (array_key_exists($input, $data)) {
                $value = is_scalar($data[$input]) ? trim((string)$data[$input]) : '';
                $version->$field = $value === '' ? null : $value;
            }
        }
        if (array_key_exists('tags', $data) && is_array($data['tags'])) {
            $version->tags = implode(', ', array_slice(array_filter(array_map('trim', array_map('strval', $data['tags'])), 'strlen'), 0, 10)) ?: null;
        }

        $version->content_html = BlogSeo::cleanHtml((string)$version->content_html);
        if (!$version->slug) {
            $version->slug = BlogSeo::slugify((string)$version->title);
        } else {
            $version->slug = BlogSeo::slugify($version->slug);
        }
        if ($version->tags !== null) {
            $tags = array_slice(array_unique(array_filter(array_map(static function ($tag) {
                return mb_substr(trim($tag), 0, 40);
            }, explode(',', $version->tags)), 'strlen')), 0, 10);
            $version->tags = $tags ? implode(', ', $tags) : null;
        }
        // A cover must be one we stored; anything else is dropped rather than shown on the site.
        if ($version->cover_image_url && !MasjidMedia::isBlogCoverUrl($version->cover_image_url)) {
            $version->cover_image_url = null;
            $version->cover_thumb_url = null;
        }
        if ($version->cover_thumb_url && !MasjidMedia::isBlogCoverUrl($version->cover_thumb_url)) {
            $version->cover_thumb_url = $version->cover_image_url;
        }

        $version->source = $source;
        $version->created_by = $actorId;
        $version->note = isset($data['note']) && trim((string)$data['note']) !== '' ? mb_substr(trim((string)$data['note']), 0, 2000) : null;
        $version->word_count = BlogSeo::wordCount($version->content_html);
        $version->seo_score = BlogSeo::score($version)['score'];

        $version->validate();
        $errors = $version->getFirstErrors();
        if ($version->content_html === '' && !isset($errors['content_html'])) {
            $errors['content_html'] = 'Please write the article.';
        }
        if (!isset($errors['slug']) && self::slugTaken((string)$version->slug, $article ? (int)$article->id : null)) {
            $errors['slug'] = 'Another article already uses this web address. Please change the slug.';
        }
        return [$version, self::toInputNames($errors)];
    }

    /** Saves $version as the next version of $article. */
    public static function saveVersion(BlogArticle $article, BlogArticleVersion $version): void
    {
        $version->article_id = (int)$article->id;
        $version->version_no = $article->nextVersionNo();
        $version->created_at = date('Y-m-d H:i:s');
        $version->save(false);
    }

    /** True when the two versions hold the same content (nothing worth a new version). */
    public static function sameContent(?BlogArticleVersion $a, BlogArticleVersion $b): bool
    {
        return $a !== null && $a->contentValues() === $b->contentValues();
    }

    /** Errors that stop an article going to review; empty when it may be submitted. */
    public static function submitErrors(BlogArticle $article, BlogArticleVersion $version): array
    {
        $errors = [];
        if ($version->word_count < BlogSeo::MIN_WORDS_TO_SUBMIT) {
            $errors['contentHtml'] = sprintf('Please write at least %d words before submitting (now %d).', BlogSeo::MIN_WORDS_TO_SUBMIT, $version->word_count);
        }
        if (!$version->category) {
            $errors['category'] = 'Please choose a category.';
        }
        if (trim((string)$version->meta_description) === '') {
            $errors['metaDescription'] = 'Please write a short description for search results.';
        }
        if ($errors) {
            return $errors;
        }

        $waiting = BlogArticle::find()
            ->where(['author_id' => $article->author_id, 'status' => [BlogArticle::STATUS_SUBMITTED, BlogArticle::STATUS_CHANGES_PROPOSED]])
            ->andWhere(['<>', 'id', $article->id])
            ->count();
        if ($waiting >= self::MAX_WAITING_PER_AUTHOR) {
            return ['form' => sprintf('You already have %d articles waiting for review. Please wait for them to be reviewed.', $waiting)];
        }
        $today = BlogArticleEvent::find()
            ->where(['action' => 'submitted', 'actor_id' => $article->author_id])
            ->andWhere(['>=', 'created_at', date('Y-m-d 00:00:00')])
            ->count();
        if ($today >= self::MAX_SUBMITS_PER_DAY) {
            return ['form' => 'You have submitted several times today. Please try again tomorrow.'];
        }
        return [];
    }

    public static function submit(BlogArticle $article, BlogArticleVersion $version, Customer $author): void
    {
        $from = $article->status;
        $article->status = BlogArticle::STATUS_SUBMITTED;
        $article->reject_reason = null;
        $article->submitted_at = date('Y-m-d H:i:s');
        self::touch($article);
        BlogArticleEvent::log($article, 'submitted', $from, (int)$author->id, 'author', (int)$version->id);
        BlogMailer::notifyAdminSubmitted($article, $version, $author);
    }

    /**
     * Makes $version the live version. Returns an error message when its slug is now used elsewhere.
     */
    public static function publish(BlogArticle $article, BlogArticleVersion $version, Customer $actor, string $action, string $actorRole, ?string $note = null): ?string
    {
        if (self::slugTaken((string)$version->slug, (int)$article->id)) {
            return 'Another article already uses this web address. Change the slug and try again.';
        }
        $from = $article->status;
        $article->status = BlogArticle::STATUS_PUBLISHED;
        $article->is_public = 1;
        $article->slug = $version->slug;
        $article->live_version_id = (int)$version->id;
        $article->latest_version_id = (int)$version->id;
        $article->proposal_version_id = null;
        $article->reject_reason = null;
        if ($actorRole === 'admin') {
            $article->reviewed_by = (int)$actor->id;
        }
        if (!$article->published_at) {
            $article->published_at = date('Y-m-d H:i:s');
        }
        self::touch($article);
        BlogArticleEvent::log($article, $action, $from, (int)$actor->id, $actorRole, (int)$version->id, $note);
        // The author is told when an editor publishes; accepting a proposal is their own action.
        if ($action === 'published') {
            BlogMailer::notifyAuthorPublished($article, $version, $article->author);
        }
        return null;
    }

    public static function touch(BlogArticle $article): void
    {
        $article->updated_at = date('Y-m-d H:i:s');
        $article->save(false);
    }

    /**
     * Counts one view per visitor per article per day. Bots, the author and empty user agents are not counted.
     * Returns the article's view total.
     */
    public static function countView(BlogArticle $article, ?Customer $viewer): int
    {
        $request = Yii::$app->request;
        $userAgent = (string)$request->userAgent;
        if ($userAgent === '' || preg_match('/bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|prerender/i', $userAgent)) {
            return (int)$article->views;
        }
        if ($viewer && (int)$viewer->id === (int)$article->author_id) {
            return (int)$article->views;
        }

        $day = date('Y-m-d');
        $salt = (string)(Yii::$app->request->cookieValidationKey ?? '');
        $hash = sha1(($viewer ? 'u' . $viewer->id : (string)$request->userIP . '|' . $userAgent) . '|' . $day . '|' . $salt);
        $inserted = Yii::$app->db->createCommand(
            'INSERT IGNORE INTO {{%blog_article_view}} (article_id, view_date, visitor_hash) VALUES (:id, :day, :hash)',
            [':id' => $article->id, ':day' => $day, ':hash' => $hash]
        )->execute();
        if (!$inserted) {
            return (int)$article->views;
        }

        $before = (int)$article->views;
        $article->updateCounters(['views' => 1]);
        $after = $before + 1;
        if (in_array($after, BlogArticle::VIEW_MILESTONES, true)) {
            $version = $article->liveVersion;
            BlogArticleEvent::log($article, 'milestone', $article->status, null, 'system', $version ? (int)$version->id : null, number_format($after) . ' views');
            if ($version) {
                BlogMailer::notifyAuthorMilestone($article, $version, $article->author, $after);
            }
        }
        return $after;
    }

    /** Field-by-field differences between two versions, for the proposal review screens. */
    public static function diff(?BlogArticleVersion $from, BlogArticleVersion $to): array
    {
        $before = $from ? $from->contentValues() : array_fill_keys(BlogArticleVersion::CONTENT_FIELDS, '');
        $after = $to->contentValues();
        $changes = [];
        foreach (BlogArticleVersion::CONTENT_FIELDS as $field) {
            if ($field === 'cover_thumb_url' || $before[$field] === $after[$field]) {
                continue;
            }
            $changes[] = ['field' => self::inputName($field), 'before' => $before[$field], 'after' => $after[$field]];
        }
        return $changes;
    }

    // ------------------------------------------------------------------ JSON shapes

    /** List card for public pages. */
    public static function card(BlogArticle $article, BlogArticleVersion $version, ?Customer $author): array
    {
        return [
            'id' => (int)$article->id,
            'slug' => $article->slug,
            'path' => '/blog/' . $article->slug,
            'title' => $version->title,
            'excerpt' => $version->meta_description ?: mb_strimwidth(BlogSeo::plainText($version->content_html), 0, 160, '…'),
            'category' => $version->category,
            'categoryLabel' => $version->getCategoryLabel(),
            'language' => $version->language,
            'coverImageUrl' => $version->cover_image_url,
            'coverThumbUrl' => $version->cover_thumb_url ?: $version->cover_image_url,
            'coverAlt' => $version->cover_alt,
            'readingMinutes' => $version->readingMinutes(),
            'views' => (int)$article->views,
            'publishedAt' => $article->published_at,
            'updatedAt' => $version->created_at,
            'author' => self::authorSummary($author),
        ];
    }

    /** Full public article. */
    public static function publicDetail(BlogArticle $article, BlogArticleVersion $version, ?Customer $author): array
    {
        return self::card($article, $version, $author) + [
            'contentHtml' => $version->content_html,
            'metaTitle' => $version->meta_title ?: $version->title,
            'metaDescription' => $version->meta_description,
            'focusKeyword' => $version->focus_keyword,
            'tags' => $version->tagList(),
            'references' => $version->references_text,
            'wordCount' => (int)$version->word_count,
        ];
    }

    public static function authorSummary(?Customer $author): array
    {
        return [
            'id' => $author ? (int)$author->id : null,
            'name' => BlogArticle::authorName($author),
            'path' => $author ? '/blog/author/' . (int)$author->id : null,
        ];
    }

    /** Every editable field of a version, with its score checklist, for the editor and review screens. */
    public static function versionDetail(BlogArticleVersion $version): array
    {
        $values = [];
        foreach (self::INPUT_FIELDS as $input => $field) {
            $values[$input] = $version->$field;
        }
        $values['tags'] = $version->tagList();
        $score = BlogSeo::score($version);
        return $values + [
            'id' => (int)$version->id,
            'versionNo' => (int)$version->version_no,
            'source' => $version->source,
            'note' => $version->note,
            'coverThumbUrl' => $version->cover_thumb_url,
            'wordCount' => (int)$version->word_count,
            'seoScore' => (int)$version->seo_score,
            'seoChecks' => $score['checks'],
            'createdAt' => $version->created_at,
            'createdBy' => (int)$version->created_by,
        ];
    }

    /** Version list without content, newest first. */
    public static function versionList(BlogArticle $article, ?array $names = null): array
    {
        $versions = BlogArticleVersion::find()
            ->select(['id', 'version_no', 'source', 'title', 'seo_score', 'word_count', 'note', 'created_by', 'created_at'])
            ->where(['article_id' => $article->id])
            ->orderBy(['version_no' => SORT_DESC])
            ->all();
        $names = $names ?? self::names(array_map(static function (BlogArticleVersion $version) {
            return (int)$version->created_by;
        }, $versions));
        return array_map(static function (BlogArticleVersion $version) use ($article, $names) {
            return [
                'id' => (int)$version->id,
                'versionNo' => (int)$version->version_no,
                'source' => $version->source,
                'title' => $version->title,
                'seoScore' => (int)$version->seo_score,
                'wordCount' => (int)$version->word_count,
                'note' => $version->note,
                'createdBy' => $names[(int)$version->created_by] ?? null,
                'createdAt' => $version->created_at,
                'isLive' => (int)$version->id === (int)$article->live_version_id && (int)$article->is_public === 1,
                'isLatest' => (int)$version->id === (int)$article->latest_version_id,
                'isProposal' => (int)$version->id === (int)$article->proposal_version_id,
            ];
        }, $versions);
    }

    /** The article's timeline, newest first. Admin names are shown to admins only. */
    public static function timeline(BlogArticle $article, bool $showAdminNames): array
    {
        $events = BlogArticleEvent::find()->where(['article_id' => $article->id])->orderBy(['id' => SORT_DESC])->all();
        $names = self::names(array_map(static function (BlogArticleEvent $event) {
            return (int)$event->actor_id;
        }, $events));
        $versionNos = BlogArticleVersion::find()->select(['version_no', 'id'])->where(['article_id' => $article->id])->indexBy('id')->column();
        return array_map(static function (BlogArticleEvent $event) use ($names, $versionNos, $showAdminNames) {
            $actor = $event->actor_role === 'admin' && !$showAdminNames ? 'SalahTime editor' : ($names[(int)$event->actor_id] ?? null);
            return [
                'id' => (int)$event->id,
                'action' => $event->action,
                'actionLabel' => $event->getActionLabel(),
                'fromStatus' => $event->from_status,
                'toStatus' => $event->to_status,
                'actorRole' => $event->actor_role,
                'actor' => $event->actor_role === 'system' ? 'SalahTime' : $actor,
                'versionNo' => $event->version_id ? (int)($versionNos[$event->version_id] ?? 0) ?: null : null,
                'note' => $event->note,
                'createdAt' => $event->created_at,
            ];
        }, $events);
    }

    /** id => display name, in one query. */
    public static function names(array $ids): array
    {
        $ids = array_values(array_unique(array_filter($ids)));
        if (!$ids) {
            return [];
        }
        $names = [];
        foreach (Customer::find()->where(['id' => $ids])->all() as $customer) {
            $names[(int)$customer->id] = BlogArticle::authorName($customer);
        }
        return $names;
    }

    public static function categoryOptions(): array
    {
        $options = [];
        foreach (BlogArticleVersion::CATEGORIES as $value => $label) {
            $options[] = ['value' => $value, 'label' => $label];
        }
        return $options;
    }

    private static function slugTaken(string $slug, ?int $articleId): bool
    {
        $query = BlogArticle::find()->where(['slug' => $slug]);
        if ($articleId) {
            $query->andWhere(['<>', 'id', $articleId]);
        }
        return $query->exists();
    }

    private static function inputName(string $field): string
    {
        $flipped = array_flip(self::INPUT_FIELDS);
        return $flipped[$field] ?? $field;
    }

    private static function toInputNames(array $errors): array
    {
        $result = [];
        foreach ($errors as $field => $message) {
            $result[self::inputName($field)] = $message;
        }
        return $result;
    }
}
