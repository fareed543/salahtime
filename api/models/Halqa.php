<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_halqa".
 *
 * @property int $id
 * @property string $name
 * @property string|null $address
 * @property string|null $description
 * @property string|null $city
 * @property string|null $state
 * @property string|null $country
 * @property int|null $id_customer
 * @property int $status
 * @property string $created_at
 * @property string $updated_at
 */
class Halqa extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_halqa';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['name'], 'required'],
            [['address', 'description', 'city', 'state', 'country'], 'string'],
            [['id_customer', 'status'], 'integer'],
            [['created_at', 'updated_at'], 'safe'],
            [['name'], 'string', 'max' => 255],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'name' => 'Name',
            'address' => 'Address',
            'description' => 'Description',
            'city' => 'City',
            'state' => 'State',
            'country' => 'Country',
            'id_customer' => 'Id Customer',
            'status' => 'Status',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }
}
