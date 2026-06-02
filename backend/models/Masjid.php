<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_masjid".
 *
 * @property int $id
 * @property string $name
 * @property string|null $address
 * @property string|null $area
 * @property string|null $city
 * @property string|null $state
 * @property string|null $pincode
 * @property string|null $country
 * @property int $status 1=Active, 0=Inactive
 * @property int|null $id_customer
 * @property int|null $id_halqa
 * @property string $created_at
 * @property string $updated_at
 */
class Masjid extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_masjid';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['name'], 'required'],
            [['address', 'area', 'city', 'state', 'pincode', 'country'], 'string'],
            [['status', 'id_customer', 'id_halqa'], 'integer'],
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
            'area' => 'Area',
            'city' => 'City',
            'state' => 'State',
            'pincode' => 'Pincode',
            'country' => 'Country',
            'status' => 'Status',
            'id_customer' => 'Id Customer',
            'id_halqa' => 'Id Halqa',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }
}
