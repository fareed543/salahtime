<?php

use yii\db\Migration;

class m260603_012000_add_pincode_to_customer_table extends Migration
{
    public function safeUp()
    {
        $schema = $this->db->getTableSchema('{{%customer}}', true);

        if ($schema !== null && !isset($schema->columns['pincode'])) {
            $this->addColumn('{{%customer}}', 'pincode', $this->string(20)->notNull()->defaultValue(''));
        }
    }

    public function safeDown()
    {
        $schema = $this->db->getTableSchema('{{%customer}}', true);

        if ($schema !== null && isset($schema->columns['pincode'])) {
            $this->dropColumn('{{%customer}}', 'pincode');
        }
    }
}
