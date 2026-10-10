<?php

use yii\db\Migration;

/**
 * Support Desk: issues reported by users from the app/website ("Report an Issue").
 */
class m261010_100000_create_support_ticket_table extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%support_ticket}}', true) !== null) {
            return;
        }

        $this->createTable('{{%support_ticket}}', [
            'id' => $this->primaryKey(),
            'reference' => $this->string(20)->null(),
            'category' => $this->string(40)->notNull(),
            'message' => $this->text()->notNull(),
            'name' => $this->string(120)->null(),
            'email' => $this->string(190)->null(),
            'customer_id' => $this->integer()->null(),
            // Where and on what the issue happened, to help reproduce it.
            'page_url' => $this->string(500)->null(),
            'platform' => $this->string(20)->null(),
            'app_version' => $this->string(30)->null(),
            'language' => $this->string(10)->null(),
            'location' => $this->string(190)->null(),
            'context' => $this->text()->null(),
            'user_agent' => $this->string(500)->null(),
            'ip_address' => $this->string(45)->null(),
            // Back office handling.
            'status' => $this->string(20)->notNull()->defaultValue('new'),
            'admin_note' => $this->text()->null(),
            'handled_by' => $this->integer()->null(),
            'resolved_at' => $this->dateTime()->null(),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex('idx-support-ticket-reference', '{{%support_ticket}}', 'reference', true);
        $this->createIndex('idx-support-ticket-status', '{{%support_ticket}}', ['status', 'created_at']);
        $this->createIndex('idx-support-ticket-category', '{{%support_ticket}}', 'category');
        $this->createIndex('idx-support-ticket-ip', '{{%support_ticket}}', ['ip_address', 'created_at']);
    }

    public function safeDown()
    {
        $this->dropTable('{{%support_ticket}}');
    }
}
