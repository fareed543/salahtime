<?php

namespace app\models;

use yii\db\ActiveRecord;

class UserRolePermission extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_user_role_permission';
    }

    public function rules()
    {
        return [
            [['user_role_id', 'permission_id'], 'required'],
            [['user_role_id', 'permission_id'], 'integer'],
            [['created_at'], 'safe'],
        ];
    }

    public function getCustomer_type_id()
    {
        return $this->getAttribute('user_role_id');
    }
}
