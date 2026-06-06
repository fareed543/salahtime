<?php

namespace app\models;

use yii\db\ActiveRecord;

class MasjidDetail extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%masjid_detail}}';
    }

    public function rules()
    {
        return [
            [['id_masjid'], 'required'],
            [['id_masjid'], 'integer'],
            [['location'], 'string'],
            [['qr_approved', 'stay_nearby', 'ladies_jamat', 'ladies_ramzan_access', 'wazu_khana', 'toilet', 'gusl_khana', 'air_conditioners', 'chairs'], 'boolean'],
            [['email', 'qr_approved_by'], 'string', 'max' => 255],
            [['contact'], 'string', 'max' => 100],
            [['temperature'], 'string', 'max' => 20],
            [['qr_code_url'], 'string', 'max' => 500],
        ];
    }
}
