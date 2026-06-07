<?php

use yii\db\Migration;

/**
 * Class m250302_190658_update_customer_table
 */
class m250302_190658_update_customer_table extends Migration
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
        $this->addColumnIfMissing('{{%customer}}', 'occupation', $this->string(255)->notNull()->defaultValue(''));
        $this->addColumnIfMissing('{{%customer}}', 'college_name', $this->string(255)->defaultValue(null));
        $this->addColumnIfMissing('{{%customer}}', 'company_name', $this->text()->defaultValue(null));
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumnIfExists('{{%customer}}', 'occupation');
        $this->dropColumnIfExists('{{%customer}}', 'college_name');
        $this->dropColumnIfExists('{{%customer}}', 'company_name');
    }

   
}
