<?php

use yii\db\Migration;

/**
 * Class m241220_101150_create_customers
 */
class m241220_101150_create_customer_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%customer}}', true) !== null) {
            return;
        }

        // Keep this aligned with the Wallet Plus dump so customer imports can be restored directly.
        $this->createTable('{{%customer}}', [
            'id' => $this->primaryKey(),
            'id_customer_type' => $this->integer(1)->notNull(),
            'firstname' => $this->string(255)->notNull(),
            'lastname' => $this->string(255)->notNull()->defaultValue(''),
            'gender' => $this->string(1)->notNull()->comment('f: Female; m: Male'),
            'date_of_birth' => $this->date()->notNull()->comment('Customer Date of Birth'),
            'username' => $this->string(255)->notNull(),
            'image' => $this->string(255)->notNull()->defaultValue(''),
            'email' => $this->string(255)->notNull()->defaultValue(''),
            'password' => $this->string(255)->notNull(),
            'otp' => $this->string(4)->notNull()->defaultValue('0000'),
            'phone' => $this->string(255)->notNull(),
            'email_verification_code' => $this->string(255)->defaultValue(null),
            'email_verified' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'mobile_verification_code' => $this->string(255)->notNull()->defaultValue(''),
            'mobile_verified' => $this->tinyInteger(1)->notNull()->defaultValue(0),
            'ipaddress' => $this->string(50)->notNull()->defaultValue(''),
            'authKey' => $this->string(255)->notNull()->defaultValue(''),
            'date_created' => $this->dateTime()->notNull(),
            'created_by' => $this->integer()->notNull()->defaultValue(0)->comment('User who created the record'),
            'updated_by' => $this->integer()->notNull()->defaultValue(0)->comment('User who last updated the record'),
            'date_updated' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP')->append('ON UPDATE CURRENT_TIMESTAMP'),
            'active' => $this->tinyInteger(1)->notNull()->defaultValue(1)->comment('1: Enable; 0: Disable'),
            'offline_access' => $this->tinyInteger(1)->notNull()->defaultValue(0)->comment('1: Enable; 0: Disable'),
            'email_notification' => $this->tinyInteger(1)->notNull()->defaultValue(1)->comment('1: Enable; 0: Disable'),
            'address' => $this->string(255)->notNull()->defaultValue(''),
            'pincode' => $this->string(20)->notNull()->defaultValue(''),
            'masjid' => $this->string(255)->defaultValue(null),
            'landmark' => $this->text()->defaultValue(null),
            'street' => $this->text()->defaultValue(null),
            'notes' => $this->text()->defaultValue(null),
            'occupation' => $this->string(255)->notNull()->defaultValue(''),
            'designation' => $this->text()->defaultValue(null),
            'college_name' => $this->string(255)->defaultValue(null),
            'company_name' => $this->text()->defaultValue(null),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%customer}}');
    }

}
