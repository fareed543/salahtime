<?php

namespace app\models;

use yii\db\ActiveRecord;

class City extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%city}}';
    }

    public function rules()
    {
        return [
            [['public_id', 'country_id', 'state_id', 'name', 'slug', 'latitude', 'longitude', 'timezone'], 'required'],
            [['country_id', 'state_id', 'status', 'is_featured', 'sort_order', 'created_by', 'updated_by'], 'integer'],
            [['latitude'], 'number', 'min' => -90, 'max' => 90],
            [['longitude'], 'number', 'min' => -180, 'max' => 180],
            [['search_aliases'], 'string'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'official_name', 'slug', 'timezone'], 'string', 'max' => 191],
            [['public_id', 'city_type'], 'string', 'max' => 32],
            [['public_id'], 'unique'],
            [['slug'], 'unique', 'targetAttribute' => ['country_id', 'state_id', 'slug'], 'message' => 'City slug must be unique within its parent location.'],
            [['country_id'], 'exist', 'targetClass' => Country::class, 'targetAttribute' => ['country_id' => 'id']],
            [['state_id'], 'exist', 'targetClass' => StateProvince::class, 'targetAttribute' => ['state_id' => 'id']],
            ['timezone', 'validateTimezone'],
            ['state_id', 'validateStateCountry'],
        ];
    }

    public function validateTimezone($attribute): void
    {
        if (!in_array((string)$this->$attribute, \DateTimeZone::listIdentifiers(), true)) {
            $this->addError($attribute, 'Timezone must be a valid IANA timezone.');
        }
    }

    public function validateStateCountry($attribute): void
    {
        $state = StateProvince::findOne(['id' => (int)$this->$attribute]);
        if ($state && (int)$state->country_id !== (int)$this->country_id) {
            $this->addError($attribute, 'State/province must belong to the selected country.');
        }
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        if (!$insert) {
            $this->public_id = (string)$this->getOldAttribute('public_id');
        }
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

    public function getState()
    {
        return $this->hasOne(StateProvince::class, ['id' => 'state_id']);
    }

    public function fields()
    {
        $fields = parent::fields();
        $fields['id_city'] = static function (City $city): int {
            return (int)$city->id;
        };
        $fields['id_state'] = static function (City $city): int {
            return (int)$city->state_id;
        };
        $fields['id_country'] = static function (City $city): int {
            return (int)$city->country_id;
        };
        $fields['state_code'] = static function (City $city): string {
            return $city->state ? (string)$city->state->code : '';
        };
        $fields['country_code'] = static function (City $city): string {
            return $city->country ? (string)$city->country->iso2_code : '';
        };

        return $fields;
    }
}
