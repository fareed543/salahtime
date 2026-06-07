<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%packets}}`.
 */
class m250315_091929_create_packets_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%subscriber_packets}}', true) !== null) {
            return;
        }

        $this->createTable('{{%subscriber_packets}}', [
            'id' => $this->primaryKey(),
            'id_program' => $this->integer()->notNull(),
            'token' => $this->integer()->null(),
            'id_customer' => $this->integer()->notNull(),
            'date' => $this->dateTime()->notNull(),
            'packets' => $this->text()->notNull(),
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP')->append('ON UPDATE CURRENT_TIMESTAMP'),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%subscriber_packets}}');
    }
}
