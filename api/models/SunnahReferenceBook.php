<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * NF-015: a hadith book a Sunnah card can cite (Tirmizi, Mishkaat, ...).
 *
 * @property int $id
 * @property string $name
 * @property int $sort_order
 * @property int $active
 */
class SunnahReferenceBook extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%sunnah_reference_book}}';
    }
}
