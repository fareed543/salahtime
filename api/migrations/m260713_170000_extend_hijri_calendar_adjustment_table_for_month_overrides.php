<?php

use yii\db\Migration;

class m260713_170000_extend_hijri_calendar_adjustment_table_for_month_overrides extends Migration
{
    public function safeUp()
    {
        $table = '{{%hijri_calendar_adjustment}}';
        $schema = $this->db->getTableSchema($table, true);

        if ($schema === null) {
            return;
        }

        if (!isset($schema->columns['hijri_year'])) {
            $this->addColumn($table, 'hijri_year', $this->integer()->null()->after('title'));
        }

        if (!isset($schema->columns['hijri_month'])) {
            $this->addColumn($table, 'hijri_month', $this->smallInteger()->null()->after('hijri_year'));
        }

        if (!isset($schema->columns['original_start_date'])) {
            $this->addColumn($table, 'original_start_date', $this->date()->null()->after('hijri_month'));
        }

        if (!isset($schema->columns['original_end_date'])) {
            $this->addColumn($table, 'original_end_date', $this->date()->null()->after('original_start_date'));
        }

        if (!isset($schema->columns['updated_start_date'])) {
            $this->addColumn($table, 'updated_start_date', $this->date()->null()->after('original_end_date'));
        }

        if (!isset($schema->columns['updated_end_date'])) {
            $this->addColumn($table, 'updated_end_date', $this->date()->null()->after('updated_start_date'));
        }

        $schema = $this->db->getTableSchema($table, true);
        if ($schema !== null && isset($schema->columns['hijri_year']) && isset($schema->columns['hijri_month'])) {
            $this->createIndex(
                'idx-hijri-calendar-adjustment-month-year',
                $table,
                ['hijri_year', 'hijri_month'],
                true
            );
        }
    }

    public function safeDown()
    {
        $table = '{{%hijri_calendar_adjustment}}';
        $schema = $this->db->getTableSchema($table, true);

        if ($schema === null) {
            return;
        }

        if (isset($schema->columns['hijri_year']) && isset($schema->columns['hijri_month'])) {
            $this->dropIndex('idx-hijri-calendar-adjustment-month-year', $table);
        }

        if (isset($schema->columns['updated_end_date'])) {
            $this->dropColumn($table, 'updated_end_date');
        }

        if (isset($schema->columns['updated_start_date'])) {
            $this->dropColumn($table, 'updated_start_date');
        }

        if (isset($schema->columns['original_end_date'])) {
            $this->dropColumn($table, 'original_end_date');
        }

        if (isset($schema->columns['original_start_date'])) {
            $this->dropColumn($table, 'original_start_date');
        }

        if (isset($schema->columns['hijri_month'])) {
            $this->dropColumn($table, 'hijri_month');
        }

        if (isset($schema->columns['hijri_year'])) {
            $this->dropColumn($table, 'hijri_year');
        }
    }
}
