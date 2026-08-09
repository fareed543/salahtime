<?php

namespace app\models;

use yii\db\ActiveRecord;

class StateProvince extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%state}}';
    }

    public function rules()
    {
        return [
            [['country_id', 'name', 'code', 'slug'], 'required'],
            [['country_id', 'status', 'sort_order', 'created_by', 'updated_by'], 'integer'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'official_name', 'slug', 'timezone'], 'string', 'max' => 191],
            [['code', 'type'], 'string', 'max' => 32],
            [['country_id'], 'exist', 'targetClass' => Country::class, 'targetAttribute' => ['country_id' => 'id']],
            [['code'], 'unique', 'targetAttribute' => ['country_id', 'code'], 'message' => 'State code must be unique within the country.'],
            [['slug'], 'unique', 'targetAttribute' => ['country_id', 'slug'], 'message' => 'State slug must be unique within the country.'],
            ['timezone', 'validateTimezone'],
        ];
    }

    public function validateTimezone($attribute): void
    {
        $value = trim((string)$this->$attribute);
        if ($value !== '' && !in_array($value, \DateTimeZone::listIdentifiers(), true)) {
            $this->addError($attribute, 'Timezone must be a valid IANA timezone.');
        }
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        $this->code = strtoupper((string)$this->code);
        $this->slug = Country::slugify((string)$this->slug);
        $this->updated_at = date('Y-m-d H:i:s');
        if ($insert && empty($this->created_at)) {
            $this->created_at = $this->updated_at;
        }

        return true;
    }

    public function getCountry()
    {
        return $this->hasOne(Country::class, ['id' => 'country_id']);
    }

    public function getCities()
    {
        return $this->hasMany(City::class, ['state_id' => 'id']);
    }
}
