<?php

namespace app\models;

use yii\db\ActiveRecord;

class Permission extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%permission}}';
    }

    public function rules()
    {
        return [
            [['name', 'code'], 'required'],
            [['description'], 'string'],
            [['status', 'is_system'], 'integer'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'code', 'group_key'], 'string', 'max' => 191],
            [['code'], 'unique'],
        ];
    }
}
