<?php

namespace app\models;

use yii\db\ActiveRecord;

class MasjidTiming extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%masjid_timing}}';
    }

    public function rules()
    {
        return [
            [['id_masjid', 'salah'], 'required'],
            [['id_masjid', 'sort_order'], 'integer'],
            [['salah'], 'string', 'max' => 100],
            [['azan_time', 'jamat_time'], 'string', 'max' => 50],
        ];
    }
}
