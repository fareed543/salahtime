<?php

namespace app\models;

use yii\db\ActiveRecord;

class AppMenu extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_app_menu';
    }

    public function rules()
    {
        return [
            [['code', 'label_key', 'icon', 'route'], 'required'],
            [['enabled', 'sort_order'], 'integer'],
            [['code', 'label_key', 'icon', 'route'], 'string', 'max' => 255],
            [['code'], 'unique'],
        ];
    }
}
