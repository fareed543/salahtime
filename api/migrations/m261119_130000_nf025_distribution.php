<?php

use yii\db\Migration;

/**
 * NF-025 packet distribution by QR scan: subscriber token, per-day packet count, collection time / method, undo log.
 * Runs database/2026-11-19_nf025_distribution.sql (MariaDB, safe to run more than once).
 */
class m261119_130000_nf025_distribution extends Migration
{
    public function safeUp()
    {
        $sql = file_get_contents(dirname(__DIR__, 2) . '/database/2026-11-19_nf025_distribution.sql');
        $sql = preg_replace('/^\s*--.*$/m', '', $sql);
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
            if (stripos($statement, 'INSERT INTO `bt_migration`') === 0) {
                continue; // Yii records the migration itself.
            }
            $this->execute($statement);
        }
    }

    public function safeDown()
    {
        $this->execute('DROP TABLE IF EXISTS `bt_subscriber_packets_log`');
        $this->execute('DROP TABLE IF EXISTS `bt_program_day`');
        $this->execute('ALTER TABLE `bt_subscriber_packets` DROP COLUMN IF EXISTS `method`, DROP COLUMN IF EXISTS `collected_at`');
        $this->execute('ALTER TABLE `bt_program_customer` DROP INDEX IF EXISTS `uq_program_customer_token`, DROP COLUMN IF EXISTS `token`');
    }
}
