<?php

namespace app\models;

use yii\db\ActiveRecord;

class LocationCountry extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%countries}}';
    }

    public function rules()
    {
        return [
            [['name', 'code', 'slug'], 'required'],
            [['is_active'], 'boolean'],
            [['name'], 'string', 'max' => 100],
            [['code'], 'string', 'max' => 3],
            [['slug'], 'string', 'max' => 120],
            [['timezone'], 'string', 'max' => 100],
            [['code'], 'unique'],
            [['slug'], 'unique'],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        $this->code = strtoupper(trim((string)$this->code));
        $this->slug = self::slugify((string)$this->slug);
        $this->is_active = (int)(bool)$this->is_active;

        return true;
    }

    /**
     * Same rule as the website's URL slugs (frontend/tools/generate-sitemap.js: lower-case, NFKD, drop
     * accents, non-alphanumerics to "-"), so "Türkiye" -> "turkiye" and "Québec City" -> "quebec-city".
     */
    public static function slugify(string $value): string
    {
        $value = mb_strtolower(trim($value), 'UTF-8');
        if (class_exists('Normalizer')) {
            $value = preg_replace('/\p{Mn}/u', '', (string)\Normalizer::normalize($value, \Normalizer::FORM_KD));
        } else {
            $value = strtr($value, self::ACCENTS);
        }
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?: '';
        return trim($value, '-');
    }

    /** Fallback when the intl extension is missing: letters that NFKD splits into base letter + accent. */
    private const ACCENTS = [
        'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a', 'ā' => 'a', 'ă' => 'a', 'ą' => 'a',
        'ç' => 'c', 'ć' => 'c', 'ĉ' => 'c', 'ċ' => 'c', 'č' => 'c', 'ď' => 'd',
        'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e', 'ē' => 'e', 'ĕ' => 'e', 'ė' => 'e', 'ę' => 'e', 'ě' => 'e',
        'ĝ' => 'g', 'ğ' => 'g', 'ġ' => 'g', 'ģ' => 'g', 'ĥ' => 'h',
        'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i', 'ĩ' => 'i', 'ī' => 'i', 'ĭ' => 'i', 'į' => 'i',
        'ĵ' => 'j', 'ķ' => 'k', 'ĺ' => 'l', 'ļ' => 'l', 'ľ' => 'l',
        'ñ' => 'n', 'ń' => 'n', 'ņ' => 'n', 'ň' => 'n',
        'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'ō' => 'o', 'ŏ' => 'o', 'ő' => 'o',
        'ŕ' => 'r', 'ŗ' => 'r', 'ř' => 'r', 'ś' => 's', 'ŝ' => 's', 'ş' => 's', 'š' => 's', 'ţ' => 't', 'ť' => 't',
        'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u', 'ũ' => 'u', 'ū' => 'u', 'ŭ' => 'u', 'ů' => 'u', 'ű' => 'u', 'ų' => 'u',
        'ŵ' => 'w', 'ý' => 'y', 'ÿ' => 'y', 'ŷ' => 'y', 'ź' => 'z', 'ż' => 'z', 'ž' => 'z',
    ];

    public function getCities()
    {
        return $this->hasMany(LocationCity::class, ['country_id' => 'id']);
    }
}
