<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_program_customer".
 *
 * @property int $id
 * @property int $id_program
 * @property int $id_customer
 * @property string $created_at
 */
class ProgramCustomer extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_program_customer';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['id_program', 'id_customer'], 'required'],
            [['id_program', 'id_customer'], 'integer'],
            [['created_at'], 'safe'],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'id_program' => 'Id Program',
            'id_customer' => 'Id Customer',
            'created_at' => 'Created At',
        ];
    }
}
