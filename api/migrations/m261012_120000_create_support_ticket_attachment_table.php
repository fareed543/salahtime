<?php

use yii\db\Migration;

/**
 * Support Desk: screenshots/PDFs attached to a "Report an Issue" submission.
 * Files live outside the web root (@runtime/support-attachments) and are served to the back office only.
 */
class m261012_120000_create_support_ticket_attachment_table extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%support_ticket_attachment}}', true) !== null) {
            return;
        }

        $this->createTable('{{%support_ticket_attachment}}', [
            'id' => $this->primaryKey(),
            'ticket_id' => $this->integer()->notNull(),
            'original_name' => $this->string(190)->notNull(),
            'stored_name' => $this->string(80)->notNull(),
            'mime_type' => $this->string(60)->notNull(),
            'size_bytes' => $this->integer()->notNull(),
            'width' => $this->integer()->null(),
            'height' => $this->integer()->null(),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex('idx-support-ticket-attachment-ticket', '{{%support_ticket_attachment}}', 'ticket_id');
    }

    public function safeDown()
    {
        $this->dropTable('{{%support_ticket_attachment}}');
    }
}
