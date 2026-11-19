<?php

use yii\db\Migration;

/**
 * CR-024: optional WhatsApp group link on a program.
 * Same change as database/2026-11-19_cr024_program_whatsapp.sql (safe to run more than once).
 */
class m261119_120000_cr024_program_whatsapp extends Migration
{
    public function safeUp()
    {
        $this->execute('ALTER TABLE `bt_program` ADD COLUMN IF NOT EXISTS `whatsapp_group_url` varchar(500) DEFAULT NULL AFTER `email`');
    }

    public function safeDown()
    {
        $this->execute('ALTER TABLE `bt_program` DROP COLUMN IF EXISTS `whatsapp_group_url`');
    }
}
