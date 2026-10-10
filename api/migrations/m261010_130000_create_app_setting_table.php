<?php

use yii\db\Migration;

/**
 * Back-office "General Settings": one row per section (authChannels, smsProvider, ...),
 * values stored as JSON so new sections need no schema change.
 */
class m261010_130000_create_app_setting_table extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%app_setting}}', true) !== null) {
            return;
        }

        $this->createTable('{{%app_setting}}', [
            'id' => $this->primaryKey(),
            'section' => $this->string(64)->notNull(),
            'settings' => $this->text()->notNull(),
            'updated_by' => $this->integer()->null(),
            'updated_by_name' => $this->string(150)->null(),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ], 'CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci ENGINE=InnoDB');

        $this->createIndex('idx-app-setting-section', '{{%app_setting}}', 'section', true);
    }

    public function safeDown()
    {
        $this->dropTable('{{%app_setting}}');
    }
}
