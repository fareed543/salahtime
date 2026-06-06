<?php

namespace app\models;

use yii\db\ActiveRecord;

class MasjidCommitteeMember extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%masjid_committee_member}}';
    }

    public function rules()
    {
        return [
            [['id_masjid', 'name', 'role'], 'required'],
            [['id_masjid', 'sort_order'], 'integer'],
            [['name', 'role'], 'string', 'max' => 255],
            [['phone'], 'string', 'max' => 50],
        ];
    }
}
