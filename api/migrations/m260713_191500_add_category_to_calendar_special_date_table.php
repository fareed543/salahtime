<?php

use yii\db\Migration;

class m260713_191500_add_category_to_calendar_special_date_table extends Migration
{
    public function safeUp()
    {
        $table = '{{%calendar_special_date}}';
        $schema = $this->db->getTableSchema($table, true);

        if ($schema === null || isset($schema->columns['category'])) {
            return;
        }

        $this->addColumn($table, 'category', $this->string(50)->notNull()->defaultValue('other')->after('description'));
    }

    public function safeDown()
    {
        $table = '{{%calendar_special_date}}';
        $schema = $this->db->getTableSchema($table, true);

        if ($schema === null || !isset($schema->columns['category'])) {
            return;
        }

        $this->dropColumn($table, 'category');
    }
}
