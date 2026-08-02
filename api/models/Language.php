<?php

namespace app\models;

use yii\db\ActiveRecord;

class Language extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%language}}';
    }

    public static function primaryKey()
    {
        return ['id_language'];
    }

    public function rules()
    {
        return [
            [['id_language', 'sort_order', 'status'], 'integer'],
            [['name', 'code'], 'required'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'native_name'], 'string', 'max' => 191],
            [['code'], 'string', 'max' => 10],
            [['code'], 'unique'],
        ];
    }
}
