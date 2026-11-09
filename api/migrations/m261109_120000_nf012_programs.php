<?php

use yii\db\Migration;

/**
 * NF-012 Sehri & Iftar programs: members, volunteers, daily packets, gender-separated lists.
 * Runs database/2026-11-09_nf012_programs.sql (MariaDB, safe to run more than once).
 */
class m261109_120000_nf012_programs extends Migration
{
    public function safeUp()
    {
        $sql = file_get_contents(dirname(__DIR__, 2) . '/database/2026-11-09_nf012_programs.sql');
        // Strip comment lines, then run statement by statement.
        $sql = preg_replace('/^\s*--.*$/m', '', $sql);
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
            $this->execute($statement);
        }
    }

    public function safeDown()
    {
        echo "m261109_120000_nf012_programs cannot be reverted (packets column type change).\n";
        return false;
    }
}
