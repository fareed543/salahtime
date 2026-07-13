<?php

use yii\db\Migration;

class m260713_140000_create_hijri_calendar_adjustment_table extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%hijri_calendar_adjustment}}', true) !== null) {
            return;
        }

        $this->createTable('{{%hijri_calendar_adjustment}}', [
            'id' => $this->primaryKey(),
            'title' => $this->string()->notNull(),
            'start_date' => $this->date()->notNull(),
            'end_date' => $this->date()->notNull(),
            'adjustment_days' => $this->smallInteger()->notNull()->defaultValue(0),
            'notes' => $this->text()->null(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
            'created_at' => $this->dateTime()->null(),
            'updated_at' => $this->dateTime()->null(),
        ]);

        $this->createIndex(
            'idx-hijri-calendar-adjustment-date-range',
            '{{%hijri_calendar_adjustment}}',
            ['start_date', 'end_date', 'is_active']
        );
    }

    public function safeDown()
    {
        if ($this->db->getTableSchema('{{%hijri_calendar_adjustment}}', true) === null) {
            return;
        }

        $this->dropTable('{{%hijri_calendar_adjustment}}');
    }
}
