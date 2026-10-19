-- ---------------------------------------------------------------------------------------------
-- Masjid WhatsApp group link, Google Maps link, Imam and Muazzin contacts (Support Desk ST-00013).
-- SQL equivalent of api/migrations/m261019_120000_add_contacts_and_links_to_masjid_detail.php.
--
-- All columns are optional. Imam/Muazzin phones are shown to signed-in app users only.
-- Safe to run more than once.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE `bt_masjid_detail`
  ADD COLUMN IF NOT EXISTS `whatsapp_group_url` varchar(500) DEFAULT NULL AFTER `contact`,
  ADD COLUMN IF NOT EXISTS `map_url` varchar(500) DEFAULT NULL AFTER `whatsapp_group_url`,
  ADD COLUMN IF NOT EXISTS `imam_name` varchar(150) DEFAULT NULL AFTER `map_url`,
  ADD COLUMN IF NOT EXISTS `imam_phone` varchar(30) DEFAULT NULL AFTER `imam_name`,
  ADD COLUMN IF NOT EXISTS `muazzin_name` varchar(150) DEFAULT NULL AFTER `imam_phone`,
  ADD COLUMN IF NOT EXISTS `muazzin_phone` varchar(30) DEFAULT NULL AFTER `muazzin_name`;

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261019_120000_add_contacts_and_links_to_masjid_detail', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261019_120000_add_contacts_and_links_to_masjid_detail'
);

-- Rollback:
--   ALTER TABLE `bt_masjid_detail` DROP COLUMN `muazzin_phone`, DROP COLUMN `muazzin_name`,
--     DROP COLUMN `imam_phone`, DROP COLUMN `imam_name`, DROP COLUMN `map_url`, DROP COLUMN `whatsapp_group_url`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261019_120000_add_contacts_and_links_to_masjid_detail';
