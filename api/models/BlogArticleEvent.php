<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * One step in a blog article's timeline (NF-003): who did what, when, and the status it moved to.
 *
 * @property int $id
 * @property int $article_id
 * @property int|null $version_id
 * @property string $action
 * @property string|null $from_status
 * @property string|null $to_status
 * @property int|null $actor_id
 * @property string $actor_role   author | admin | system
 * @property string|null $note
 * @property string $created_at
 */
class BlogArticleEvent extends ActiveRecord
{
    public const ACTIONS = [
        'created' => 'Created',
        'saved' => 'Saved a new version',
        'submitted' => 'Submitted for review',
        'published' => 'Approved and published',
        'rejected' => 'Rejected',
        'proposed' => 'Proposed changes',
        'proposal_accepted' => 'Accepted the proposed changes',
        'proposal_declined' => 'Declined the proposed changes',
        'unpublished' => 'Unpublished',
        'restored' => 'Restored an older version',
        'milestone' => 'Reached a views milestone',
    ];

    public static function tableName()
    {
        return '{{%blog_article_event}}';
    }

    public static function log(BlogArticle $article, string $action, ?string $fromStatus, ?int $actorId, string $actorRole, ?int $versionId = null, ?string $note = null): void
    {
        $event = new self();
        $event->article_id = (int)$article->id;
        $event->version_id = $versionId;
        $event->action = $action;
        $event->from_status = $fromStatus;
        $event->to_status = $article->status;
        $event->actor_id = $actorId;
        $event->actor_role = $actorRole;
        $event->note = $note !== null && trim($note) !== '' ? trim($note) : null;
        $event->created_at = date('Y-m-d H:i:s');
        $event->save(false);
    }

    public function getActionLabel(): string
    {
        return self::ACTIONS[$this->action] ?? $this->action;
    }
}
