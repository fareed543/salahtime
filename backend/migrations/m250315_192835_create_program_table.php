<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%program}}`.
 */
class m250315_192835_create_program_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%program}}', [
            'id' => $this->primaryKey(),
            'id_customer' => $this->integer()->notNull(),
            'id_halqa' => $this->integer()->notNull(),
            'name' => $this->string(255)->notNull(),
            'code' => $this->string(50)->unique()->notNull(),
            'start_date' => $this->date()->notNull(),
            'end_date' => $this->date()->notNull(),
            'contact_number' => $this->string(20)->null(), // Optional
            'email' => $this->string(100)->null(), // Optional
            'registration_allowed' => $this->boolean()->notNull()->defaultValue(true),
            'max_participants' => $this->integer()->notNull()->defaultValue(100), // Max registrations
            'waitlist_enabled' => $this->boolean()->notNull()->defaultValue(true), // Allow waitlist
            'description' => $this->text()->null(), // Optional
            'status' => "ENUM('active', 'inactive', 'completed') DEFAULT 'active'", // Optional with default
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%program}}');
    }
}
