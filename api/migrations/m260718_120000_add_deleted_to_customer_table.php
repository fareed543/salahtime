<?php

use yii\db\Migration;

class m260718_120000_add_deleted_to_customer_table extends Migration
{
    public function safeUp()
    {
        $schema = $this->db->getTableSchema('bt_customer', true);
        if ($schema === null || isset($schema->columns['deleted'])) {
            return;
        }

        $this->addColumn('bt_customer', 'deleted', $this->tinyInteger(1)->notNull()->defaultValue(0)->after('active'));
        $this->createIndex('idx_bt_customer_deleted', 'bt_customer', 'deleted');
    }

    public function safeDown()
    {
        $schema = $this->db->getTableSchema('bt_customer', true);
        if ($schema === null || !isset($schema->columns['deleted'])) {
            return;
        }

        $this->dropIndex('idx_bt_customer_deleted', 'bt_customer');
        $this->dropColumn('bt_customer', 'deleted');
    }
}
