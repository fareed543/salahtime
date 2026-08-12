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

    public static function slugify(string $value): string
    {
        $normalized = strtolower(trim($value));
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?: '';
        return trim($normalized, '-');
    }

    public function getStates()
    {
        return $this->hasMany(LocationState::class, ['country_id' => 'id']);
    }

    public function getCities()
    {
        return $this->hasMany(LocationCity::class, ['country_id' => 'id']);
    }
}
