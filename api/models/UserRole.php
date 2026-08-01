<?php

namespace app\models;

use yii\db\ActiveRecord;

class UserRole extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_user_role';
    }

    public function rules()
    {
        return [
            [['status', 'is_system'], 'integer'],
            [['description'], 'string'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'code'], 'string', 'max' => 255],
            [['code'], 'unique'],
        ];
    }

    public function attributeLabels()
    {
        return [
            'id_user_role' => 'Id User Role',
            'name' => 'Name',
            'code' => 'Code',
            'description' => 'Description',
            'status' => 'Status',
            'is_system' => 'Is System',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }

    public function getId_customer_type()
    {
        return $this->getAttribute('id_user_role');
    }
}
