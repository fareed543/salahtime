-- ---------------------------------------------------------------------------------------------
-- CR-024: one optional WhatsApp group link per program (chat.whatsapp.com / wa.me).
-- Only enrolled subscribers and the program team receive it from the API.
-- SQL equivalent of api/migrations/m261119_120000_cr024_program_whatsapp.php.
-- Safe to run more than once. Run on dev / production BEFORE deploying the CR-024 API.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE `bt_program`
  ADD COLUMN IF NOT EXISTS `whatsapp_group_url` varchar(500) DEFAULT NULL AFTER `email`;

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261119_120000_cr024_program_whatsapp', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261119_120000_cr024_program_whatsapp'
);

-- Rollback:
--   ALTER TABLE `bt_program` DROP COLUMN `whatsapp_group_url`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261119_120000_cr024_program_whatsapp';
