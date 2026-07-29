<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property string $install_id
 * @property int|null $customer_id
 * @property string|null $platform
 * @property string|null $push_token
 * @property int $notifications_enabled
 * @property string|null $app_version
 * @property string|null $last_seen_at
 * @property string|null $created_at
 * @property string|null $updated_at
 */
class PushSubscription extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_push_subscription';
    }

    public function rules()
    {
        return [
            [['install_id'], 'required'],
            [['customer_id'], 'integer'],
            [['notifications_enabled'], 'boolean'],
            [['last_seen_at', 'created_at', 'updated_at'], 'safe'],
            [['install_id'], 'string', 'max' => 191],
            [['platform', 'app_version'], 'string', 'max' => 50],
            [['push_token'], 'string', 'max' => 500],
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
        if (empty($this->last_seen_at)) {
            $this->last_seen_at = $now;
        }

        return true;
    }
}
