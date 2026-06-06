<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_member".
 *
 * @property int $id_member
 * @property string $firstname
 * @property string $lastname
 * @property string $phone_number
 * @property string $email
 * @property string|null $birthday
 * @property string $address
 * @property string|null $notes
 * @property string|null $photo
 * @property string|null $halka
 * @property string|null $masjid
 * @property string $id_customer
 * @property string|null $date_created
 * @property string|null $date_updated
 */
class Member extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_member';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['firstname', 'id_customer'], 'required'],
            [['date_created', 'date_updated',], 'safe'],
            [['firstname', 'lastname', ], 'string', 'max' => 255],
            [['phone_number'], 'string', 'max' => 15],
            [['firstname', 'lastname', 'phone_number'], 'unique', 'targetAttribute' => ['firstname', 'lastname', 'phone_number', 'id_customer']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id_member' => 'Id Member',
            'firstname' => 'Firstname',
            'lastname' => 'Lastname',
            'phone_number' => 'Phone Number',
            'id_customer' => 'Id Customer',
            'date_created' => 'Date Created',
            'date_updated' => 'Date Updated',
        ];
    }
}
