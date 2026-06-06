<?php

namespace app\models;

use yii\db\ActiveRecord;

class KnowledgeTag extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_knowledge_tag';
    }

    public function rules()
    {
        return [
            [['code', 'name'], 'required'],
            [['status', 'sort_order'], 'integer'],
            [['code', 'name'], 'string', 'max' => 255],
            [['code'], 'unique'],
        ];
    }
}
