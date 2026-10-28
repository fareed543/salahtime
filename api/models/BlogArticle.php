<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * A blog article written by a user (NF-003). Its content lives in immutable versions
 * (BlogArticleVersion); this row points at the live, latest and proposed ones.
 *
 * @property int $id
 * @property int $author_id
 * @property string $status            draft | submitted | changes_proposed | published | rejected
 * @property int $is_public           1 while a live version is shown on the site
 * @property string|null $slug        slug of the live version (unique)
 * @property int|null $live_version_id
 * @property int|null $latest_version_id    the author's working copy
 * @property int|null $proposal_version_id  admin changes waiting for the author
 * @property int $views
 * @property string|null $reject_reason
 * @property int|null $reviewed_by
 * @property string|null $submitted_at
 * @property string|null $published_at
 * @property string $created_at
 * @property string $updated_at
 */
class BlogArticle extends ActiveRecord
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_CHANGES_PROPOSED = 'changes_proposed';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [
        self::STATUS_DRAFT => 'Draft',
        self::STATUS_SUBMITTED => 'Submitted',
        self::STATUS_CHANGES_PROPOSED => 'Changes proposed',
        self::STATUS_PUBLISHED => 'Published',
        self::STATUS_REJECTED => 'Rejected',
    ];

    /** Views at which the author is told how far the article has reached. */
    public const VIEW_MILESTONES = [100, 1000, 10000, 100000];

    public static function tableName()
    {
        return '{{%blog_article}}';
    }

    public function getLiveVersion()
    {
        return $this->hasOne(BlogArticleVersion::class, ['id' => 'live_version_id']);
    }

    public function getLatestVersion()
    {
        return $this->hasOne(BlogArticleVersion::class, ['id' => 'latest_version_id']);
    }

    public function getProposalVersion()
    {
        return $this->hasOne(BlogArticleVersion::class, ['id' => 'proposal_version_id']);
    }

    public function getAuthor()
    {
        return $this->hasOne(Customer::class, ['id' => 'author_id']);
    }

    public function getStatusLabel(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function nextVersionNo(): int
    {
        return (int)BlogArticleVersion::find()->where(['article_id' => $this->id])->max('version_no') + 1;
    }

    /** "Aisha Khan" for the article's byline; the username when no name was given. */
    public static function authorName(?Customer $author): string
    {
        if (!$author) {
            return 'SalahTime reader';
        }
        $name = trim(preg_replace('/\s+/', ' ', ((string)$author->firstname) . ' ' . ((string)$author->lastname)));
        return $name !== '' ? $name : ((string)$author->username ?: 'SalahTime reader');
    }
}
