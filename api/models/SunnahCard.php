<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * NF-015: one Sunnah card.
 *
 * @property int $id
 * @property int $category_id
 * @property string $slug
 * @property string $headline     JSON per language; *words* are shown in the template's accent colour
 * @property string $body         JSON per language
 * @property string|null $zikr    JSON {"arabic", "transliteration", "meaning": {lang: text}}
 * @property string $template     t01 ... t10
 * @property string|null $image_url  uploaded photo (photo style); null = template background
 * @property string|null $thumb_url
 * @property string|null $source_page  admin-only note, e.g. "Pyari Sunnaten p.103"
 * @property int $sort_order
 * @property string $status       draft | published
 * @property int $likes
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property string|null $published_at
 * @property string $created_at
 * @property string $updated_at
 */
class SunnahCard extends ActiveRecord
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';

    public static function tableName()
    {
        return '{{%sunnah_card}}';
    }

    public function getCategory()
    {
        return $this->hasOne(SunnahCategory::class, ['id' => 'category_id']);
    }

    public function getReferences()
    {
        return $this->hasMany(SunnahCardReference::class, ['card_id' => 'id'])->orderBy(['sort_order' => SORT_ASC, 'id' => SORT_ASC]);
    }
}
