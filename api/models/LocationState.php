<?php

namespace app\models;

use yii\db\ActiveRecord;

class LocationState extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%states}}';
    }

    public function rules()
    {
        return [
            [['country_id', 'name', 'slug'], 'required'],
            [['country_id', 'is_active'], 'integer'],
            [['name'], 'string', 'max' => 150],
            [['code'], 'string', 'max' => 50],
            [['slug'], 'string', 'max' => 180],
            [['country_id'], 'exist', 'targetClass' => LocationCountry::class, 'targetAttribute' => ['country_id' => 'id']],
            [['slug'], 'unique', 'targetAttribute' => ['country_id', 'slug'], 'message' => 'State slug must be unique within the country.'],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        $this->code = trim((string)$this->code);
        $this->slug = LocationCountry::slugify((string)$this->slug);
        $this->is_active = (int)(bool)$this->is_active;

        return true;
    }

    public function getCountry()
    {
        return $this->hasOne(LocationCountry::class, ['id' => 'country_id']);
    }

    public function getCities()
    {
        return $this->hasMany(LocationCity::class, ['state_id' => 'id']);
    }
}
