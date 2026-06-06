<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_city_price".
 *
 * @property int $id_city_price
 * @property int|null $id_city
 * @property int $id_category
 * @property float|null $price
 * @property string|null $created_at
 * @property string $updated_at
 */
class CityPrice extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_city_price';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['id_city', 'id_category'], 'integer'],
            [['id_category'], 'required'],
            [['price'], 'number'],
            [['created_at', 'updated_at'], 'safe'],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id_city_price' => 'Id City Price',
            'id_city' => 'Id City',
            'id_category' => 'Id Category',
            'price' => 'Price',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }
}
