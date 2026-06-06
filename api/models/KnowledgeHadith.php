<?php

namespace app\models;

use yii\db\ActiveRecord;

class KnowledgeHadith extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_knowledge_hadith';
    }

    public function rules()
    {
        return [
            [['title', 'arabic_text'], 'required'],
            [['arabic_text'], 'string'],
            [['is_farz', 'status', 'sort_order'], 'integer'],
            [['title', 'reference_source', 'reference_link', 'rule_type'], 'string', 'max' => 255],
        ];
    }
}
