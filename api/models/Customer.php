<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_customer".
 *
 * @property int $id
 * @property int $id_role
 * @property string $firstname
 * @property string $lastname
 * @property string $gender
 * @property string $username
 * @property string $image
 * @property string $email
 * @property string $password
 * @property string $address
 * @property string $masjid
 * @property string $landmark
 * @property string $street
 * @property string $notes
 * @property string $occupation
 * @property string $college_name
 * @property string $pincode
 * @property string $designation
 * @property string $company_name
 * @property string $otp
 * @property string $phone
 * @property string|null $email_verification_code
 * @property int $email_verified
 * @property string $mobile_verification_code
 * @property int $mobile_verified
 * @property string $ipaddress
 * @property string $authKey
 * @property string $date_created
 * @property string $date_updated
 * @property int $active
 * @property int $deleted
 * @property int $offline_access
 * @property int $email_notification
 */
class Customer extends \yii\db\ActiveRecord implements \yii\web\IdentityInterface
{
    public $imageFile;

    public static function tableName()
    {
        return 'bt_customer';
    }

    public static function roleColumnName(): string
    {
        return 'id_role';
    }

    public function rules()
    {
        return [
            [['firstname', 'phone'], 'required'],
            [['id_role', 'email_verified', 'mobile_verified', 'active', 'deleted', 'offline_access', 'email_notification'], 'integer'],
            [['date_created', 'date_updated'], 'safe'],
            [['firstname', 'lastname', 'username', 'image', 'email', 'password', 'phone', 'email_verification_code', 'mobile_verification_code', 'authKey'], 'string', 'max' => 255],
            [['gender'], 'string', 'max' => 1],
            [['otp'], 'string', 'max' => 4],
            [['ipaddress'], 'string', 'max' => 50],
            ['username', 'unique', 'message' => 'Phone Number already exists!'],
            ['email', 'unique', 'message' => 'Email already exists!'],
            [['imageFile'], 'file', 'skipOnEmpty' => true, 'extensions' => 'png, jpg, jpeg'],
            [['address', 'masjid', 'landmark', 'street', 'notes', 'occupation', 'college_name', 'company_name', 'pincode', 'designation'], 'string'],
            [['address', 'masjid', 'landmark', 'street', 'notes', 'occupation', 'college_name', 'company_name', 'pincode', 'designation'], 'safe'],
        ];
    }

    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'id_role' => 'Role',
            'firstname' => 'Firstname',
            'lastname' => 'Lastname',
            'gender' => 'Gender',
            'username' => 'Phone number',
            'image' => 'Profile Picture',
            'email' => 'Email',
            'password' => 'Password',
            'otp' => 'Otp',
            'phone' => 'Phone',
            'pincode' => 'Pincode',
            'designation' => 'Designation',
            'email_verification_code' => 'Email Verification Code',
            'email_verified' => 'Email Verified',
            'mobile_verification_code' => 'Mobile Verification Code',
            'mobile_verified' => 'Mobile Verified',
            'ipaddress' => 'Ipaddress',
            'authKey' => 'Auth Key',
            'date_created' => 'Date Created',
            'date_updated' => 'Date Updated',
            'active' => 'Active',
            'deleted' => 'Deleted',
            'offline_access' => 'Offline Access',
            'email_notification' => 'Email Notification',
        ];
    }

    public static function find()
    {
        return new CustomerQuery(get_called_class());
    }

    public function beforeSave($insert)
    {
        if ($this->isNewRecord) {
            if ($this->id_role === null) {
                $this->id_role = 3;
            }

            $this->lastname = $this->lastname ?? '';
            $this->gender = $this->gender ?: 'm';
            $this->date_of_birth = $this->date_of_birth ?: '2000-01-01';
            $this->otp = $this->otp ?: '0000';
            $this->mobile_verification_code = $this->mobile_verification_code ?: Yii::$app->security->generateRandomString(32);
            $this->mobile_verified = $this->mobile_verified ?? 0;
            $this->authKey = $this->authKey ?: Yii::$app->security->generateRandomString(64);
            $this->created_by = $this->created_by ?? 0;
            $this->updated_by = $this->updated_by ?? 0;
            $this->active = $this->active ?? 1;
            $this->deleted = $this->deleted ?? 0;
            $this->offline_access = $this->offline_access ?? 0;
            $this->email_notification = $this->email_notification ?? 1;
            $this->address = $this->address ?? '';
            $this->occupation = $this->occupation ?? '';
            $this->pincode = $this->pincode ?? '';
            $this->date_created = new \yii\db\Expression('NOW()');
            $this->password = Yii::$app->security->generatePasswordHash($this->password);
            $this->ipaddress = getenv('HTTP_CLIENT_IP')
                ?: getenv('HTTP_X_FORWARDED_FOR')
                ?: getenv('HTTP_X_FORWARDED')
                ?: getenv('HTTP_FORWARDED_FOR')
                ?: getenv('HTTP_FORWARDED')
                ?: getenv('REMOTE_ADDR');
        } else {
            $this->date_updated = new \yii\db\Expression('NOW()');
        }

        return parent::beforeSave($insert);
    }

    public function getId()
    {
        return $this->id;
    }

    public function getAuthKey()
    {
        return $this->authKey;
    }

    public function validateAuthKey($authKey)
    {
        return $this->authKey === $authKey;
    }

    public static function findIdentity($id)
    {
        return self::findOne($id);
    }

    public static function findIdentityByAccessToken($token, $type = null)
    {
        throw new yii\base\NotSupportedException();
    }

    public static function findByPhone($phone)
    {
        return self::findOne(['phone' => $phone]);
    }

    public static function findByEmail($email)
    {
        return self::findOne(['email' => $email]);
    }

    public function validatePassword($password)
    {
        return Yii::$app->getSecurity()->validatePassword($password, $this->password);
    }

    public function getId_customer_type()
    {
        return $this->id_role;
    }

    public function setId_customer_type($value): void
    {
        $this->id_role = $value;
    }

    public function getId_user_role()
    {
        return $this->id_role;
    }

    public function setId_user_role($value): void
    {
        $this->id_role = $value;
    }
}
