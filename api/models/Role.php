<?php

namespace app\models;

use yii\db\ActiveRecord;

class Role extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%role}}';
    }

    public static function roleColumnName(): string
    {
        return 'id';
    }

    public function rules()
    {
        return [
            [['id'], 'integer'],
            [['name', 'code'], 'required'],
            [['description'], 'string'],
            [['status', 'is_system'], 'integer'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'code'], 'string', 'max' => 191],
            [['code'], 'unique'],
        ];
    }

    public function getId_customer_type()
    {
        return $this->id;
    }

    public function getId_user_role()
    {
        return $this->id;
    }
}
