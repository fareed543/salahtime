<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_subscriber_packets".
 *
 * @property int $id
 * @property int|null $token
 * @property int $id_customer
 * @property string $date
 * @property string $packets
 * @property string $created_at
 * @property string $updated_at
 */
class SubscriberPackets extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_subscriber_packets';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['token', 'id_customer', 'id_program'], 'integer'],
            [['id_customer', 'id_program', 'date', 'packets'], 'required'],
            [['date', 'created_at', 'updated_at'], 'safe'],
            [['packets'], 'string'],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'token' => 'Token',
            'id_customer' => 'Id Customer',
            'id_program' => 'Id Program',
            'date' => 'Date',
            'packets' => 'Packets',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }
}
