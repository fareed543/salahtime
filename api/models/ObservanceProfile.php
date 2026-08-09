<?php

namespace app\models;

use yii\db\ActiveRecord;

class ObservanceProfile extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%observance_profile}}';
    }
}
