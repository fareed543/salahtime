<?php

use yii\db\Migration;

/**
 * Class m250301_060636_update_member_table
 */
class m250301_060636_update_member_table extends Migration
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
        $this->addColumnIfMissing('{{%member}}', 'email', $this->string(255)->notNull()->defaultValue(''));
        $this->addColumnIfMissing('{{%member}}', 'birthday', $this->date()->defaultValue(null));
        $this->addColumnIfMissing('{{%member}}', 'address', $this->string(255)->notNull()->defaultValue(''));
        $this->addColumnIfMissing('{{%member}}', 'notes', $this->text()->defaultValue(null));
        $this->addColumnIfMissing('{{%member}}', 'photo', $this->string(255)->defaultValue(null));
        $this->addColumnIfMissing('{{%member}}', 'document', $this->string(255)->defaultValue(null));
        $this->addColumnIfMissing('{{%member}}', 'halka', $this->string(255)->defaultValue(null));
        $this->addColumnIfMissing('{{%member}}', 'masjid', $this->string(255)->defaultValue(null));
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumnIfExists('{{%member}}', 'email');
        $this->dropColumnIfExists('{{%member}}', 'birthday');
        $this->dropColumnIfExists('{{%member}}', 'address');
        $this->dropColumnIfExists('{{%member}}', 'notes');
        $this->dropColumnIfExists('{{%member}}', 'photo');
        $this->dropColumnIfExists('{{%member}}', 'document');
        $this->dropColumnIfExists('{{%member}}', 'halka');
        $this->dropColumnIfExists('{{%member}}', 'masjid');
    }

    /*
    // Use up()/down() to run migration code without a transaction.
    public function up()
    {

    }

    public function down()
    {
        echo "m250301_060636_update_member_table cannot be reverted.\n";

        return false;
    }
    */
}
