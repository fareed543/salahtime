<?php

use yii\db\Migration;

class m260713_183000_create_calendar_special_date_table extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%calendar_special_date}}', true) !== null) {
            return;
        }

        $this->createTable('{{%calendar_special_date}}', [
            'id' => $this->primaryKey(),
            'title' => $this->string()->notNull(),
            'event_date' => $this->date()->notNull(),
            'description' => $this->text()->null(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
            'sort_order' => $this->integer()->null()->defaultValue(0),
            'created_at' => $this->dateTime()->null(),
            'updated_at' => $this->dateTime()->null(),
        ]);

        $this->createIndex(
            'idx-calendar-special-date-event-date',
            '{{%calendar_special_date}}',
            ['event_date', 'is_active', 'sort_order']
        );
    }

    public function safeDown()
    {
        if ($this->db->getTableSchema('{{%calendar_special_date}}', true) === null) {
            return;
        }

        $this->dropTable('{{%calendar_special_date}}');
    }
}
