<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * NF-015: one like of a Sunnah card from one device (no login).
 *
 * @property int $id
 * @property int $card_id
 * @property string $device_id
 * @property string|null $ip
 * @property string $created_at
 */
class SunnahLike extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%sunnah_like}}';
    }
}
