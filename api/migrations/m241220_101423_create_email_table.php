<?php

use yii\db\Migration;

/**
 * Class m241220_101423_create_email
 */
class m241220_101423_create_email_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%email}}', [
            'id_email' => $this->primaryKey(),
            'name' => $this->string(255)->defaultValue(null),
            'id_email_template' => $this->integer()->defaultValue(null),
            'email_content' => $this->text()->notNull(),
            'from_name' => $this->string(255)->defaultValue(null),
            'from_email' => $this->string(255)->defaultValue(null),
            'subject' => $this->string(255)->defaultValue(null),
            'cc_email' => $this->string(255)->defaultValue(null),
            'create_by' => $this->integer()->defaultValue(null),
            'created_at' => $this->dateTime()->defaultValue(null),
            'updated_by' => $this->integer()->defaultValue(null),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP')->append('ON UPDATE CURRENT_TIMESTAMP'),
        ]);

        $this->batchInsert('{{%email}}', [
            'id_email',
            'name',
            'id_email_template',
            'email_content',
            'from_name',
            'from_email',
            'subject',
            'cc_email',
            'create_by',
            'created_at',
            'updated_by',
            'updated_at'
        ], [
            [1, 'Welcome Email', 1, 'We are excited to welcome you to Salah Time. With Salah Time, you can stay connected with masjids, programs, and prayer-time services in one place.<br/> Thank you for choosing Salah Time.', 'Salah Time', 'contact@salah-times.in', 'Welcome to Salah Time', 'contact@salah-times.in', null, null, null, '2023-03-18 20:08:47'],
            [3, 'Email Verification', 1, 'You registered an account on Salah Time. Enter the verification OTP to activate your account.', 'Salah Time', 'contact@salah-times.in', 'Salah Time Email Verification', 'contact@salah-times.in', null, null, null, '2023-03-18 19:45:46'],
            [4, 'Login', 1, 'We noticed a new sign-in to your Salah Time account. If this was you, you do not need to do anything. If not, please secure your account.', 'Salah Time', 'contact@salah-times.in', 'Salah Time Login Alert', 'contact@salah-times.in', null, null, null, '2023-03-18 19:46:16'],
            [5, 'Forgot Password', 1, 'Resetting your password is easy.<br /> Enter the OTP below and choose your new password.', 'Salah Time', 'contact@salah-times.in', 'Salah Time Password Reset OTP', 'contact@salah-times.in', null, null, null, '2023-03-22 06:52:34'],
            [6, 'Password Updated Successfully', 1, 'We are writing to inform you that your Salah Time password has been successfully updated. Your account security is our top priority, and we encourage you to keep your password safe.', 'Salah Time', 'contact@salah-times.in', 'Salah Time Password Updated', 'contact@salah-times.in', null, null, null, '2023-03-18 19:50:51'],
            [8, 'Email Verified Successfully', 1, 'Your email address has been successfully verified on Salah Time. Thank you for helping us keep your account secure.', 'Salah Time', 'contact@salah-times.in', 'Salah Time Email Verified', 'contact@salah-times.in', null, null, null, '2023-03-18 19:52:11'],
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%email}}');
    }
}
