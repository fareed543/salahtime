<?php

namespace app\models;

use yii\db\ActiveRecord;

class Country extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%country}}';
    }

    public function rules()
    {
        return [
            [['name', 'iso2_code', 'iso3_code', 'slug', 'default_timezone'], 'required'],
            [['status', 'sort_order', 'created_by', 'updated_by'], 'integer'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'official_name', 'slug', 'default_timezone'], 'string', 'max' => 191],
            [['default_language'], 'string', 'max' => 10],
            [['iso2_code'], 'string', 'length' => 2],
            [['iso3_code', 'numeric_code'], 'string', 'max' => 3],
            [['name'], 'unique'],
            [['iso2_code'], 'unique'],
            [['iso3_code'], 'unique'],
            [['slug'], 'unique'],
            ['default_timezone', 'validateTimezone'],
        ];
    }

    public function validateTimezone($attribute): void
    {
        if (!in_array((string)$this->$attribute, \DateTimeZone::listIdentifiers(), true)) {
            $this->addError($attribute, 'Timezone must be a valid IANA timezone.');
        }
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        $this->iso2_code = strtoupper((string)$this->iso2_code);
        $this->iso3_code = strtoupper((string)$this->iso3_code);
        $this->slug = self::slugify((string)$this->slug);
        $this->updated_at = date('Y-m-d H:i:s');
        if ($insert && empty($this->created_at)) {
            $this->created_at = $this->updated_at;
        }

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
        return $this->hasMany(StateProvince::class, ['country_id' => 'id']);
    }

    public function getCities()
    {
        return $this->hasMany(City::class, ['country_id' => 'id']);
    }
}
