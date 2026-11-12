<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * NF-015: one reference of a Sunnah card, e.g. book Tirmizi + number "96" (as printed).
 *
 * @property int $id
 * @property int $card_id
 * @property int $book_id
 * @property string $number
 * @property int $sort_order
 */
class SunnahCardReference extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%sunnah_card_reference}}';
    }

    public function getBook()
    {
        return $this->hasOne(SunnahReferenceBook::class, ['id' => 'book_id']);
    }
}
