<?php

namespace app\models;

use yii\db\ActiveRecord;

class RolePermission extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%role_permission}}';
    }

    public static function roleForeignKeyColumnName(): string
    {
        return 'role_id';
    }

    public function rules()
    {
        return [
            [['role_id', 'permission_id'], 'required'],
            [['role_id', 'permission_id'], 'integer'],
            [['created_at'], 'safe'],
        ];
    }

    public function setRoleId($value): void
    {
        $this->role_id = $value;
    }
}
