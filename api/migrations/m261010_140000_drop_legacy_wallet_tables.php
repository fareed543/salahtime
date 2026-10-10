<?php

use yii\db\Migration;

/**
 * Drops tables left over from the old Wallet app that SalahTime does not use:
 * bt_cards, bt_category and bt_expense (their create migrations were removed from the repo).
 * Irreversible: the data is gone once this runs.
 */
class m261010_140000_drop_legacy_wallet_tables extends Migration
{
    private const TABLES = ['{{%cards}}', '{{%category}}', '{{%expense}}'];

    public function safeUp()
    {
        foreach (self::TABLES as $table) {
            if ($this->db->getTableSchema($table, true) !== null) {
                $this->dropTable($table);
            } else {
                echo "    > {$table} does not exist, skipping.\n";
            }
        }
    }

    public function safeDown()
    {
        echo "m261010_140000_drop_legacy_wallet_tables cannot be reverted: the legacy wallet tables and their data were dropped.\n";
        return false;
    }
}
