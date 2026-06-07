<?php

use yii\db\Migration;

/**
 * Class m250301_125107_update_customer_table
 */
class m250301_125107_update_customer_table extends Migration
{
    private function addColumnIfMissing(string $table, string $column, $type): void
    {
        $schema = $this->db->getTableSchema($table, true);
        if ($schema !== null && !isset($schema->columns[$column])) {
            $this->addColumn($table, $column, $type);
        }
    }

    private function dropColumnIfExists(string $table, string $column): void
    {
        $schema = $this->db->getTableSchema($table, true);
        if ($schema !== null && isset($schema->columns[$column])) {
            $this->dropColumn($table, $column);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumnIfMissing('{{%customer}}', 'address', $this->string(255)->notNull()->defaultValue(''));
        $this->addColumnIfMissing('{{%customer}}', 'masjid', $this->string(255)->defaultValue(null));
        $this->addColumnIfMissing('{{%customer}}', 'landmark', $this->text()->defaultValue(null));
        $this->addColumnIfMissing('{{%customer}}', 'street', $this->text()->defaultValue(null));
        $this->addColumnIfMissing('{{%customer}}', 'notes', $this->text()->defaultValue(null));
        $this->addColumnIfMissing('{{%customer}}', 'designation', $this->text()->defaultValue(null));

    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumnIfExists('{{%customer}}', 'address');
        $this->dropColumnIfExists('{{%customer}}', 'masjid');
        $this->dropColumnIfExists('{{%customer}}', 'landmark');
        $this->dropColumnIfExists('{{%customer}}', 'street');
        $this->dropColumnIfExists('{{%customer}}', 'notes');
        $this->dropColumnIfExists('{{%customer}}', 'designation');
    }

}
