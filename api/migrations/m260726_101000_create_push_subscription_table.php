<?php

use yii\db\Migration;

class m260726_101000_create_push_subscription_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%push_subscription}}', [
            'id' => $this->primaryKey(),
            'install_id' => $this->string(191)->notNull(),
            'customer_id' => $this->integer()->null(),
            'platform' => $this->string(50)->null(),
            'push_token' => $this->string(500)->null(),
            'notifications_enabled' => $this->boolean()->notNull()->defaultValue(true),
            'app_version' => $this->string(50)->null(),
            'last_seen_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex('idx-push-subscription-install', '{{%push_subscription}}', 'install_id', true);
        $this->createIndex('idx-push-subscription-token', '{{%push_subscription}}', 'push_token');
    }

    public function safeDown()
    {
        $this->dropTable('{{%push_subscription}}');
    }
}
