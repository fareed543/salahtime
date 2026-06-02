<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_city".
 *
 * @property int $id_city
 * @property string $name
 * @property int $id_state
 * @property string $state_code
 * @property int $id_country
 * @property string $country_code
 * @property float $latitude
 * @property float $longitude
 * @property string $created_at
 * @property string $updated_at
 * @property int $flag
 * @property string|null $wikiDataId
 */
class City extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_city';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['name'], 'required'],
            [['id_state', 'id_country', 'flag'], 'integer'],
            [['latitude', 'longitude'], 'number'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'wikiDataId'], 'string', 'max' => 255],
            [['state_code', 'country_code'], 'string', 'max' => 10],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id_city' => 'Id City',
            'name' => 'Name',
            'id_state' => 'Id State',
            'state_code' => 'State Code',
            'id_country' => 'Id Country',
            'country_code' => 'Country Code',
            'latitude' => 'Latitude',
            'longitude' => 'Longitude',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
            'flag' => 'Flag',
            'wikiDataId' => 'Wiki Data ID',
        ];
    }
}
