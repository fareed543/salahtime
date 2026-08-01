<?php

namespace app\models;

use yii\db\ActiveRecord;

class Role extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%role}}';
    }

    public function rules()
    {
        return [
            [['name', 'code'], 'required'],
            [['description'], 'string'],
            [['status', 'is_system'], 'integer'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'code'], 'string', 'max' => 191],
            [['code'], 'unique'],
        ];
    }
}
