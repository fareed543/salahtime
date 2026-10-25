-- ---------------------------------------------------------------------------------------------
-- Masjid map position (latitude/longitude), used by the app's "masjids near me" distance filter.
-- SQL equivalent of api/migrations/m261012_100000_add_coordinates_to_masjid_table.php.
--
-- Existing masjids have no position until the owner sets it from the edit form
-- ("Use my current location"); until then they only show when the range is "Any distance".
-- Safe to run more than once.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE `bt_masjid`
  ADD COLUMN IF NOT EXISTS `latitude` decimal(10,7) DEFAULT NULL AFTER `country`,
  ADD COLUMN IF NOT EXISTS `longitude` decimal(10,7) DEFAULT NULL AFTER `latitude`;

-- Columns that already existed with a shorter type (float, decimal(x,4)…) drop digits and move
-- the pin; force the full 7 decimals (about 1 cm). Safe to run again.
ALTER TABLE `bt_masjid`
  MODIFY COLUMN `latitude` decimal(10,7) DEFAULT NULL,
  MODIFY COLUMN `longitude` decimal(10,7) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS `idx-masjid-latitude-longitude` ON `bt_masjid` (`latitude`, `longitude`);

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261012_100000_add_coordinates_to_masjid_table', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261012_100000_add_coordinates_to_masjid_table'
);

-- Rollback:
--   DROP INDEX `idx-masjid-latitude-longitude` ON `bt_masjid`;
--   ALTER TABLE `bt_masjid` DROP COLUMN `longitude`, DROP COLUMN `latitude`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261012_100000_add_coordinates_to_masjid_table';
