<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_halqa_masjid".
 *
 * @property int $id
 * @property int $id_halqa
 * @property int $id_masjid
 */
class HalqaMasjid extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_halqa_masjid';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['id_halqa', 'id_masjid'], 'required'],
            [['id_halqa', 'id_masjid'], 'integer'],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'id_halqa' => 'Id Halqa',
            'id_masjid' => 'Id Masjid',
        ];
    }
}
