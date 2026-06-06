<?php

namespace app\models;

use yii\db\ActiveRecord;

class KnowledgeHadithTag extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_knowledge_hadith_tag';
    }

    public function rules()
    {
        return [
            [['id_hadith', 'id_tag'], 'required'],
            [['id_hadith', 'id_tag'], 'integer'],
        ];
    }
}
