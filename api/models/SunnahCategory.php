<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * NF-015: a Sunnah Shorts category (one book chapter, e.g. "Sunnat-e-Zohar").
 *
 * @property int $id
 * @property string $name        JSON {"en": "...", "<lang>": "..."}
 * @property int $sort_order
 * @property int $active
 * @property string $created_at
 * @property string $updated_at
 */
class SunnahCategory extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%sunnah_category}}';
    }
}
