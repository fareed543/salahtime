<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * A file attached to a Support Desk report (screenshot or PDF). See app\components\SupportAttachments.
 *
 * @property int $id
 * @property int $ticket_id
 * @property string $original_name  File name as the user picked it
 * @property string $stored_name    File name on disk, under @runtime/support-attachments/<ticket_id>/
 * @property string $mime_type
 * @property int $size_bytes
 * @property int|null $width
 * @property int|null $height
 * @property string $created_at
 */
class SupportTicketAttachment extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%support_ticket_attachment}}';
    }

    public function rules()
    {
        return [
            [['ticket_id', 'original_name', 'stored_name', 'mime_type', 'size_bytes'], 'required'],
            [['ticket_id', 'size_bytes', 'width', 'height'], 'integer'],
            [['original_name'], 'string', 'max' => 190],
            [['stored_name'], 'string', 'max' => 80],
            [['mime_type'], 'string', 'max' => 60],
        ];
    }

    public function isImage(): bool
    {
        return strpos((string)$this->mime_type, 'image/') === 0;
    }

    public function serialize(): array
    {
        return [
            'id' => (int)$this->id,
            'name' => $this->original_name,
            'mimeType' => $this->mime_type,
            'isImage' => $this->isImage(),
            'sizeBytes' => (int)$this->size_bytes,
            'width' => $this->width !== null ? (int)$this->width : null,
            'height' => $this->height !== null ? (int)$this->height : null,
            'createdAt' => $this->created_at,
        ];
    }
}
