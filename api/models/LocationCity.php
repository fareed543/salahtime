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
            [['geoname_id', 'country_id', 'state_id', 'population', 'is_active'], 'integer'],
            [['latitude'], 'number', 'min' => -90, 'max' => 90],
            [['longitude'], 'number', 'min' => -180, 'max' => 180],
            [['name', 'ascii_name'], 'string', 'max' => 150],
            [['slug'], 'string', 'max' => 180],
            [['timezone'], 'string', 'max' => 100],
            [['geoname_id'], 'unique'],
            [['country_id'], 'exist', 'targetClass' => LocationCountry::class, 'targetAttribute' => ['country_id' => 'id']],
            [['state_id'], 'exist', 'targetClass' => LocationState::class, 'targetAttribute' => ['state_id' => 'id']],
            ['state_id', 'validateStateCountry'],
            [['slug'], 'unique', 'targetAttribute' => ['country_id', 'state_id', 'slug'], 'message' => 'City slug must be unique within the state.'],
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

    public function validateStateCountry($attribute): void
    {
        if ((int)$this->$attribute <= 0) {
            return;
        }

        $state = LocationState::findOne(['id' => (int)$this->$attribute]);
        if ($state && (int)$state->country_id !== (int)$this->country_id) {
            $this->addError($attribute, 'State must belong to the selected country.');
        }
    }

    public function getCountry()
    {
        return $this->hasOne(LocationCountry::class, ['id' => 'country_id']);
    }

    public function getState()
    {
        return $this->hasOne(LocationState::class, ['id' => 'state_id']);
    }
}
