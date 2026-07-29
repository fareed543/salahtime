<?php

use yii\db\Migration;

class m260726_100000_create_notification_broadcast_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%notification_broadcast}}', [
            'id' => $this->primaryKey(),
            'title' => $this->string(255)->notNull(),
            'message' => $this->text()->notNull(),
            'audience' => $this->string(50)->null()->defaultValue('all'),
            'is_published' => $this->boolean()->notNull()->defaultValue(false),
            'published_at' => $this->dateTime()->null(),
            'created_by_customer_id' => $this->integer()->null(),
            'published_by_customer_id' => $this->integer()->null(),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex(
            'idx-notification-broadcast-published',
            '{{%notification_broadcast}}',
            ['is_published', 'published_at', 'id']
        );
    }

    public function safeDown()
    {
        $this->dropTable('{{%notification_broadcast}}');
    }
}
