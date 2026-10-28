<?php

namespace app\controllers;

use app\components\BlogMailer;
use app\components\BlogSeo;
use app\components\BlogWorkflow;
use app\components\MasjidMedia;
use app\models\BlogArticle;
use app\models\BlogArticleEvent;
use app\models\BlogArticleVersion;
use app\models\Customer;
use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\web\UploadedFile;

/**
 * Blog (NF-003), public and author side.
 *
 * Readers (no login):
 *   GET  http-blog/options              categories, minimum words to submit
 *   GET  http-blog/articles             published list (page, perPage, category, search, author)
 *   GET  http-blog/article?slug=        one published article + related articles
 *   POST http-blog/view                 { slug } count a view (once per visitor per day) -> { views }
 *   GET  http-blog/author/{id}          author page: name, totals and published articles
 *   GET  http-blog/sitemap-list         every published article, for the frontend build (sitemap + prerender)
 *
 * Authors (Bearer token):
 *   GET  http-blog/mine                 my articles with status, views, reason, pending proposal
 *   GET  http-blog/my-article/{id}      latest version, live/proposal info, proposal diff, versions, timeline
 *   POST http-blog/save                 { id?, title, contentHtml, ..., submit?: bool } adds a version (and submits)
 *   POST http-blog/submit/{id}          submit the latest version for review
 *   POST http-blog/proposal/{id}        { decision: accept|decline, note? } answer an editor's proposed changes
 *   POST http-blog/cover                multipart "image" -> { imageUrl, thumbUrl }
 */
class HttpBlogController extends Controller
{
    private const AUTHOR_ACTIONS = ['mine', 'my-article', 'save', 'submit', 'proposal', 'cover'];

    /** @var Customer|null */
    private $user;

    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'OPTIONS'],
                'Access-Control-Allow-Credentials' => Yii::$app->params['corsAllowCredentials'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 86400,
            ],
        ];
        return $behaviors;
    }

    public function beforeAction($action)
    {
        $this->enableCsrfValidation = false;
        if (!parent::beforeAction($action)) {
            return false;
        }
        Yii::$app->response->format = Response::FORMAT_JSON;
        $this->user = $this->currentUser();
        if (in_array($action->id, self::AUTHOR_ACTIONS, true) && !$this->user && !Yii::$app->request->isOptions) {
            Yii::$app->response->statusCode = 401;
            Yii::$app->response->data = ['error' => 'Please log in to write articles.'];
            return false;
        }
        return true;
    }

    public function actionOptions()
    {
        return [
            'categories' => BlogWorkflow::categoryOptions(),
            'minWords' => BlogSeo::MIN_WORDS_TO_SUBMIT,
        ];
    }

    public function actionArticles()
    {
        $request = Yii::$app->request;
        $query = $this->publicQuery();

        $category = trim((string)$request->get('category', ''));
        if ($category !== '' && isset(BlogArticleVersion::CATEGORIES[$category])) {
            $query->andWhere(['v.category' => $category]);
        }
        $search = trim((string)$request->get('search', ''));
        if ($search !== '') {
            $query->andWhere(['or', ['like', 'v.title', $search], ['like', 'v.meta_description', $search], ['like', 'v.tags', $search]]);
        }
        $authorId = (int)$request->get('author', 0);
        if ($authorId > 0) {
            $query->andWhere(['a.author_id' => $authorId]);
        }

        $page = max(1, (int)$request->get('page', 1));
        $perPage = max(1, min(50, (int)$request->get('perPage', 12)));
        $total = (int)(clone $query)->count();
        $articles = $query->orderBy(['a.published_at' => SORT_DESC, 'a.id' => SORT_DESC])
            ->offset(($page - 1) * $perPage)->limit($perPage)->all();

        return [
            'items' => $this->cards($articles),
            'categories' => BlogWorkflow::categoryOptions(),
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => max(1, (int)ceil($total / $perPage)),
            ],
        ];
    }

    public function actionArticle()
    {
        $slug = trim((string)Yii::$app->request->get('slug', ''));
        $article = $slug !== '' ? $this->publicQuery()->andWhere(['a.slug' => $slug])->one() : null;
        if (!$article || !$article->liveVersion) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Article not found.'];
        }

        $version = $article->liveVersion;
        $related = $this->publicQuery()
            ->andWhere(['<>', 'a.id', $article->id])
            ->andWhere(['v.category' => $version->category])
            ->orderBy(['a.views' => SORT_DESC, 'a.published_at' => SORT_DESC])
            ->limit(3)
            ->all();

        return BlogWorkflow::publicDetail($article, $version, $article->author) + [
            'related' => $this->cards($related),
            'isAuthor' => $this->user && (int)$this->user->id === (int)$article->author_id,
        ];
    }

    public function actionView()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use POST.'];
        }
        $data = $this->body();
        $slug = trim((string)($data['slug'] ?? ''));
        $article = $slug !== '' ? BlogArticle::find()->where(['slug' => $slug, 'is_public' => 1])->one() : null;
        if (!$article) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Article not found.'];
        }
        return ['views' => BlogWorkflow::countView($article, $this->user)];
    }

    public function actionAuthor($id)
    {
        $author = Customer::find()->where(['id' => (int)$id, 'deleted' => 0])->one();
        $articles = $author ? $this->publicQuery()->andWhere(['a.author_id' => $author->id])
            ->orderBy(['a.published_at' => SORT_DESC])->all() : [];
        // Only people with a published article have a public author page.
        if (!$author || !$articles) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Author not found.'];
        }

        $first = null;
        foreach ($articles as $article) {
            $first = $first === null || $article->published_at < $first ? $article->published_at : $first;
        }
        return BlogWorkflow::authorSummary($author) + [
            'articleCount' => count($articles),
            'totalViews' => array_sum(array_map(static function (BlogArticle $article) {
                return (int)$article->views;
            }, $articles)),
            'writingSince' => $first,
            'items' => $this->cards($articles),
        ];
    }

    public function actionSitemapList()
    {
        $articles = $this->publicQuery()->orderBy(['a.published_at' => SORT_DESC])->all();
        return array_map(static function (BlogArticle $article) {
            $version = $article->liveVersion;
            return BlogWorkflow::publicDetail($article, $version, $article->author);
        }, $articles);
    }

    // ------------------------------------------------------------------ authors

    public function actionMine()
    {
        $articles = BlogArticle::find()
            ->where(['author_id' => $this->user->id])
            ->with(['latestVersion', 'liveVersion'])
            ->orderBy(['updated_at' => SORT_DESC, 'id' => SORT_DESC])
            ->all();

        $items = [];
        $totalViews = 0;
        foreach ($articles as $article) {
            $version = $article->latestVersion ?: $article->liveVersion;
            if (!$version) {
                continue;
            }
            $totalViews += (int)$article->views;
            $items[] = $this->authorRow($article, $version);
        }
        return [
            'items' => $items,
            'summary' => [
                'total' => count($items),
                'published' => count(array_filter($items, static function ($item) {
                    return $item['isPublic'];
                })),
                'totalViews' => $totalViews,
            ],
            'author' => BlogWorkflow::authorSummary($this->user),
        ];
    }

    public function actionMyArticle($id)
    {
        $article = $this->ownArticle($id);
        if (!$article instanceof BlogArticle) {
            return $article;
        }
        return $this->authorDetail($article);
    }

    public function actionSave()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use POST.'];
        }
        $data = $this->body();
        $id = (int)($data['id'] ?? 0);
        $article = null;
        if ($id > 0) {
            $article = $this->ownArticle($id);
            if (!$article instanceof BlogArticle) {
                return $article;
            }
            if ($article->status === BlogArticle::STATUS_CHANGES_PROPOSED) {
                Yii::$app->response->statusCode = 409;
                return ['error' => 'Our editor proposed changes to this article. Please accept or decline them first.'];
            }
        }

        $base = $article ? $article->latestVersion : null;
        [$version, $errors] = BlogWorkflow::buildVersion($article, $base, $data, BlogArticleVersion::SOURCE_AUTHOR, (int)$this->user->id);
        if ($errors) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Please check the article.', 'errors' => $errors];
        }
        $submit = !empty($data['submit']);

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $isNew = $article === null;
            if ($isNew) {
                $article = new BlogArticle();
                $article->author_id = (int)$this->user->id;
                $article->status = BlogArticle::STATUS_DRAFT;
                $article->created_at = date('Y-m-d H:i:s');
                $article->updated_at = $article->created_at;
                $article->save(false);
            }

            $changed = !BlogWorkflow::sameContent($base, $version);
            if ($changed) {
                BlogWorkflow::saveVersion($article, $version);
                $from = $article->status;
                $article->latest_version_id = (int)$version->id;
                // Editing takes the article out of review; the live version (if any) stays public.
                $article->status = BlogArticle::STATUS_DRAFT;
                BlogWorkflow::touch($article);
                BlogArticleEvent::log($article, $isNew ? 'created' : 'saved', $isNew ? null : $from, (int)$this->user->id, 'author', (int)$version->id);
            } else {
                $version = $base;
            }

            if ($submit) {
                $submitErrors = BlogWorkflow::submitErrors($article, $version);
                if ($submitErrors) {
                    // The draft is kept; only the submit is refused.
                    $transaction->commit();
                    Yii::$app->response->statusCode = 422;
                    return ['error' => reset($submitErrors), 'errors' => $submitErrors, 'id' => (int)$article->id, 'saved' => true];
                }
                if ($article->status !== BlogArticle::STATUS_SUBMITTED) {
                    BlogWorkflow::submit($article, $version, $this->user);
                }
            }
            $transaction->commit();
        } catch (\Throwable $error) {
            $transaction->rollBack();
            Yii::error('Blog save failed: ' . $error->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'We could not save your article. Please try again.'];
        }

        $article->refresh();
        return $this->authorDetail($article) + [
            'message' => $submit ? 'Submitted for review. We will email you when it is reviewed.' : ($changed ? 'Draft saved.' : 'No changes to save.'),
        ];
    }

    public function actionSubmit($id)
    {
        $article = $this->ownArticle($id);
        if (!$article instanceof BlogArticle) {
            return $article;
        }
        if (!in_array($article->status, [BlogArticle::STATUS_DRAFT, BlogArticle::STATUS_REJECTED], true)) {
            Yii::$app->response->statusCode = 409;
            return ['error' => 'This article is already in review or published without changes.'];
        }
        $version = $article->latestVersion;
        $errors = $version ? BlogWorkflow::submitErrors($article, $version) : ['form' => 'Nothing to submit.'];
        if ($errors) {
            Yii::$app->response->statusCode = 422;
            return ['error' => reset($errors), 'errors' => $errors];
        }
        BlogWorkflow::submit($article, $version, $this->user);
        $article->refresh();
        return $this->authorDetail($article) + ['message' => 'Submitted for review. We will email you when it is reviewed.'];
    }

    public function actionProposal($id)
    {
        $article = $this->ownArticle($id);
        if (!$article instanceof BlogArticle) {
            return $article;
        }
        $proposal = $article->proposalVersion;
        if ($article->status !== BlogArticle::STATUS_CHANGES_PROPOSED || !$proposal) {
            Yii::$app->response->statusCode = 409;
            return ['error' => 'There are no proposed changes waiting for you.'];
        }
        $data = $this->body();
        $decision = (string)($data['decision'] ?? '');
        $note = trim((string)($data['note'] ?? '')) ?: null;
        if (!in_array($decision, ['accept', 'decline'], true)) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Choose accept or decline.'];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            if ($decision === 'accept') {
                $error = BlogWorkflow::publish($article, $proposal, $this->user, 'proposal_accepted', 'author', $note);
                if ($error) {
                    $transaction->rollBack();
                    Yii::$app->response->statusCode = 409;
                    return ['error' => $error];
                }
            } else {
                $from = $article->status;
                $article->status = BlogArticle::STATUS_SUBMITTED;
                $article->proposal_version_id = null;
                BlogWorkflow::touch($article);
                BlogArticleEvent::log($article, 'proposal_declined', $from, (int)$this->user->id, 'author', (int)$proposal->id, $note);
            }
            $transaction->commit();
        } catch (\Throwable $error) {
            $transaction->rollBack();
            Yii::error('Blog proposal answer failed: ' . $error->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'We could not save your answer. Please try again.'];
        }

        BlogMailer::notifyAdminProposalAnswer($article, $proposal, $this->user, $decision === 'accept', $note);
        $article->refresh();
        return $this->authorDetail($article) + [
            'message' => $decision === 'accept' ? 'Changes accepted. Your article is published.' : 'Changes declined. Your version is back with our editor.',
        ];
    }

    public function actionCover()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use POST.'];
        }
        $file = UploadedFile::getInstanceByName('image');
        $error = MasjidMedia::validate($file);
        if ($error !== null) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $error];
        }
        try {
            $saved = MasjidMedia::saveBlogCover($file, (int)$this->user->id);
        } catch (\Throwable $exception) {
            Yii::error('Blog cover save failed: ' . $exception->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'We could not save the image. Please try another one.'];
        }
        return ['imageUrl' => $saved['image_url'], 'thumbUrl' => $saved['thumb_url']];
    }

    // ------------------------------------------------------------------ helpers

    /** Published articles joined to their live version as "v". */
    private function publicQuery()
    {
        return BlogArticle::find()->alias('a')
            ->innerJoin(BlogArticleVersion::tableName() . ' v', 'v.id = a.live_version_id')
            ->where(['a.is_public' => 1])
            ->with(['liveVersion', 'author']);
    }

    private function cards(array $articles): array
    {
        return array_values(array_map(static function (BlogArticle $article) {
            return BlogWorkflow::card($article, $article->liveVersion, $article->author);
        }, array_filter($articles, static function (BlogArticle $article) {
            return $article->liveVersion !== null;
        })));
    }

    private function authorRow(BlogArticle $article, BlogArticleVersion $version): array
    {
        return [
            'id' => (int)$article->id,
            'title' => $version->title,
            'status' => $article->status,
            'statusLabel' => $article->getStatusLabel(),
            'isPublic' => (int)$article->is_public === 1,
            'path' => (int)$article->is_public === 1 ? '/blog/' . $article->slug : null,
            'views' => (int)$article->views,
            'seoScore' => (int)$version->seo_score,
            'wordCount' => (int)$version->word_count,
            'rejectReason' => $article->reject_reason,
            'hasProposal' => $article->proposal_version_id !== null,
            'hasUnpublishedChanges' => (int)$article->is_public === 1 && (int)$article->latest_version_id !== (int)$article->live_version_id,
            'coverThumbUrl' => $version->cover_thumb_url,
            'updatedAt' => $article->updated_at,
            'publishedAt' => $article->published_at,
        ];
    }

    private function authorDetail(BlogArticle $article): array
    {
        $latest = $article->latestVersion;
        $proposal = $article->proposalVersion;
        return [
            'article' => $this->authorRow($article, $latest),
            'version' => BlogWorkflow::versionDetail($latest),
            'proposal' => $proposal ? [
                'version' => BlogWorkflow::versionDetail($proposal),
                'changes' => BlogWorkflow::diff($latest, $proposal),
            ] : null,
            'versions' => BlogWorkflow::versionList($article, null),
            'timeline' => BlogWorkflow::timeline($article, false),
        ];
    }

    /** The current user's article, or an error response. */
    private function ownArticle($id)
    {
        $article = BlogArticle::find()->where(['id' => (int)$id, 'author_id' => $this->user->id])->one();
        if (!$article || !$article->latestVersion) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Article not found.'];
        }
        return $article;
    }

    private function body(): array
    {
        $request = Yii::$app->request;
        $data = $request->getBodyParams();
        if (!is_array($data) || empty($data)) {
            $data = json_decode($request->rawBody, true);
        }
        return is_array($data) ? $data : [];
    }

    /** The logged-in user when a valid Bearer token is sent. */
    private function currentUser(): ?Customer
    {
        $header = (string)Yii::$app->request->headers->get('Authorization', '');
        $token = trim(str_replace('Bearer ', '', $header));
        if ($token === '') {
            return null;
        }
        return Customer::find()->where(['authKey' => $token, 'deleted' => 0])->one();
    }
}
