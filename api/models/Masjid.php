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
 * @property string|null $madhab hanafi | shafi
 * @property string|null $city_slug Public URL: /masjid/<city_slug>/<slug>
 * @property string|null $slug
 * @property int $status 1=Active (approved), 0=Inactive, 2=Waiting for approval
 * @property int|null $id_customer
 * @property int|null $id_halqa
 * @property string $created_at
 * @property string $updated_at
 */
class Masjid extends \yii\db\ActiveRecord
{
    public const STATUS_INACTIVE = 0;
    public const STATUS_ACTIVE = 1;
    /** Submitted from the app; hidden from others until approved in the back office. */
    public const STATUS_PENDING = 2;

    public const MADHABS = ['hanafi', 'shafi'];

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
            [['madhab'], 'in', 'range' => self::MADHABS],
            [['city_slug', 'slug'], 'string', 'max' => 160],
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
            'madhab' => 'Madhab',
            'status' => 'Status',
            'id_customer' => 'Id Customer',
            'id_halqa' => 'Id Halqa',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }
}
