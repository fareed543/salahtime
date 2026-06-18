<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_program".
 *
 * @property int $id
 * @property int $id_customer
 * @property int $id_halqa
 * @property string $name
 * @property string $code
 * @property string $start_date
 * @property string $end_date
 * @property string|null $contact_number
 * @property string|null $email
 * @property int $registration_allowed
 * @property int $max_participants
 * @property int $waitlist_enabled
 * @property string|null $description
 * @property string|null $status
 * @property string $created_at
 */
class Program extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_program';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['id_customer', 'id_halqa', 'name', 'code', 'start_date', 'end_date'], 'required'],
            [['id_customer', 'registration_allowed', 'max_participants', 'waitlist_enabled'], 'integer'],
            [['start_date', 'end_date', 'created_at'], 'safe'],
            [['description', 'status'], 'string'],
            [['program_type'], 'in', 'range' => ['general', 'sehri', 'iftar']],
            [['name'], 'string', 'max' => 255],
            [['code'], 'string', 'max' => 50],
            [['contact_number'], 'string', 'max' => 20],
            [['email'], 'string', 'max' => 100],
            [['code'], 'unique'],
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
            'id_halqa'=> 'Id Halqa',
            'name' => 'Name',
            'code' => 'Code',
            'program_type' => 'Program Type',
            'start_date' => 'Start Date',
            'end_date' => 'End Date',
            'contact_number' => 'Contact Number',
            'email' => 'Email',
            'registration_allowed' => 'Registration Allowed',
            'max_participants' => 'Max Participants',
            'waitlist_enabled' => 'Waitlist Enabled',
            'description' => 'Description',
            'status' => 'Status',
            'created_at' => 'Created At',
        ];
    }
}
