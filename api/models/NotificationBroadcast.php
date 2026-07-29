<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property string $title
 * @property string $message
 * @property string|null $audience
 * @property int $is_published
 * @property string|null $published_at
 * @property int|null $created_by_customer_id
 * @property int|null $published_by_customer_id
 * @property string|null $created_at
 * @property string|null $updated_at
 */
class NotificationBroadcast extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_notification_broadcast';
    }

    public function rules()
    {
        return [
            [['title', 'message'], 'required'],
            [['message'], 'string'],
            [['is_published'], 'boolean'],
            [['published_at', 'created_at', 'updated_at'], 'safe'],
            [['created_by_customer_id', 'published_by_customer_id'], 'integer'],
            [['title'], 'string', 'max' => 255],
            [['audience'], 'string', 'max' => 50],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        $now = date('Y-m-d H:i:s');
        if ($insert && empty($this->created_at)) {
            $this->created_at = $now;
        }
        $this->updated_at = $now;

        return true;
    }
}
