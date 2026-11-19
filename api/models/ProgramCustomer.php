<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_program_customer".
 *
 * @property int $id
 * @property int $role
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
            [['role', 'id_program', 'id_customer'], 'required'],
            [['role', 'id_program', 'id_customer'], 'integer'],
            [['created_at'], 'safe'],
            [['added_by'], 'integer'],
            // NF-025: one token per subscriber per program (unique key uq_program_customer_token).
            [['token'], 'integer', 'min' => 1, 'max' => 99999],
            [['status'], 'in', 'range' => ['enrolled', 'waitlisted']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'role' => 'Role',
            'id_program' => 'Id Program',
            'id_customer' => 'Id Customer',
            'created_at' => 'Created At',
        ];
    }
}
