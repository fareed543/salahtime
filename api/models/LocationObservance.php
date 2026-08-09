<?php

namespace app\models;

use yii\db\ActiveRecord;

class LocationObservance extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%location_observance}}';
    }

    public function getOccurrence()
    {
        return $this->hasOne(FestivalOccurrence::class, ['id' => 'festival_occurrence_id']);
    }

    public function getProfile()
    {
        return $this->hasOne(ObservanceProfile::class, ['id' => 'observance_profile_id']);
    }

    public function rules()
    {
        return [
            [['festival_occurrence_id', 'start_date', 'end_date'], 'required'],
            [['festival_occurrence_id', 'country_id', 'state_id', 'city_id', 'observance_profile_id', 'status', 'updated_by'], 'integer'],
            [['start_date', 'end_date', 'published_at', 'created_at', 'updated_at'], 'safe'],
            [['notes'], 'string'],
            [['date_status'], 'in', 'range' => ['predicted', 'expected', 'tentative', 'confirmed', 'cancelled']],
            [['source_type'], 'in', 'range' => ['calculated', 'government-announcement', 'moon-sighting-committee', 'admin-override', 'imported']],
            [['date_status'], 'string', 'max' => 32],
            [['source_type'], 'string', 'max' => 64],
            [['festival_occurrence_id'], 'exist', 'targetClass' => FestivalOccurrence::class, 'targetAttribute' => ['festival_occurrence_id' => 'id']],
            [['country_id'], 'exist', 'targetClass' => Country::class, 'targetAttribute' => ['country_id' => 'id'], 'skipOnEmpty' => true],
            [['state_id'], 'exist', 'targetClass' => StateProvince::class, 'targetAttribute' => ['state_id' => 'id'], 'skipOnEmpty' => true],
            [['city_id'], 'exist', 'targetClass' => City::class, 'targetAttribute' => ['city_id' => 'id'], 'skipOnEmpty' => true],
            ['end_date', 'compare', 'compareAttribute' => 'start_date', 'operator' => '>=', 'type' => 'date'],
        ];
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        $this->updated_at = date('Y-m-d H:i:s');
        if ($insert && empty($this->created_at)) {
            $this->created_at = $this->updated_at;
        }

        return true;
    }
}
