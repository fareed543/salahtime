<?php

namespace app\models;

use yii\db\ActiveRecord;

class KnowledgeHadithTranslation extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_knowledge_hadith_translation';
    }

    public function rules()
    {
        return [
            [['id_hadith', 'language_code'], 'required'],
            [['id_hadith'], 'integer'],
            [['meaning_text'], 'string'],
            [['language_code'], 'string', 'max' => 10],
        ];
    }
}
