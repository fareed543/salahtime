<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_ramadan_sehri_subscription".
 *
 * @property int $id
 * @property int $id_customer
 * @property string $date
 * @property string $opt
 * @property string $created_at
 * @property string $received
 * 
 */
class RamadanSehriSubscription extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_ramadan_sehri_subscription';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['id_customer', 'date', 'opt'], 'required'],
            [['id_customer'], 'integer'],
            [['date', 'created_at'], 'safe'],
            [['opt'], 'string'],
            [['received'], 'string']
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'id_customer' => 'Id Customer',
            'date' => 'Date',
            'opt' => 'Opt',
            'created_at' => 'Created At',
            'received' => 'received',
        ];
    }
}
