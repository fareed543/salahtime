<?php

use yii\db\Migration;

class m260607_137000_add_street_to_customer_table extends Migration
{
    public function safeUp()
    {
        $schema = $this->db->getTableSchema('{{%customer}}', true);

        if ($schema !== null && !isset($schema->columns['street'])) {
            $this->addColumn('{{%customer}}', 'street', $this->text()->defaultValue(null)->after('landmark'));
        }
    }

    public function safeDown()
    {
        $schema = $this->db->getTableSchema('{{%customer}}', true);

        if ($schema !== null && isset($schema->columns['street'])) {
            $this->dropColumn('{{%customer}}', 'street');
        }
    }
}
