<?php

namespace app\models;

use yii\db\ActiveRecord;

class LocationCity extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%cities}}';
    }

    public function rules()
    {
        return [
            [['country_id', 'name', 'slug', 'latitude', 'longitude', 'timezone'], 'required'],
            [['geoname_id', 'country_id', 'population', 'is_active'], 'integer'],
            [['latitude'], 'number', 'min' => -90, 'max' => 90],
            [['longitude'], 'number', 'min' => -180, 'max' => 180],
            [['name', 'ascii_name'], 'string', 'max' => 150],
            [['slug'], 'string', 'max' => 180],
            [['timezone'], 'string', 'max' => 100],
            [['geoname_id'], 'unique'],
            [['country_id'], 'exist', 'targetClass' => LocationCountry::class, 'targetAttribute' => ['country_id' => 'id']],
            [['slug'], 'unique', 'targetAttribute' => ['country_id', 'slug'], 'message' => 'City slug must be unique within the country.'],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        $this->slug = LocationCountry::slugify((string)$this->slug);
        $this->is_active = (int)(bool)$this->is_active;
        $this->population = (int)($this->population ?? 0);

        return true;
    }

    public function getCountry()
    {
        return $this->hasOne(LocationCountry::class, ['id' => 'country_id']);
    }
}
