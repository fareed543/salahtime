<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%program_customer}}`.
 */
class m250315_205904_create_program_customer_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%program_customer}}', [
            'id' => $this->primaryKey(),
            'role' => $this->integer()->notNull(),
            'id_program' => $this->integer()->notNull(),
            'id_customer' => $this->integer()->notNull(),
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%program_customer}}');
    }
}
