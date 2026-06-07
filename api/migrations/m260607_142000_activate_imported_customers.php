<?php

use yii\db\Migration;

class m260607_142000_activate_imported_customers extends Migration
{
    public function safeUp()
    {
        $schema = $this->db->getTableSchema('{{%customer}}', true);

        if ($schema === null || !isset($schema->columns['active'])) {
            return;
        }

        $this->update('{{%customer}}', ['active' => 1]);
    }

    public function safeDown()
    {
        // Intentionally left empty: we do not want to mass-deactivate imported users on rollback.
    }
}
