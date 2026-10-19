-- ---------------------------------------------------------------------------------------------
-- Hijri date adjustments per country (Support Desk ST-00019).
-- SQL equivalent of api/migrations/m261019_100000_add_country_to_hijri_calendar_adjustment.php.
--
-- Each country starts its Hijri months on its own moon sighting, so an adjustment now belongs to
-- one country and the app applies only the selected location's country's adjustments.
-- Existing adjustments followed India's sighting, so they are assigned to India.
-- Safe to run more than once.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE `bt_hijri_calendar_adjustment`
  ADD COLUMN IF NOT EXISTS `country_id` int(11) DEFAULT NULL AFTER `title`;

CREATE INDEX IF NOT EXISTS `idx-hijri-calendar-adjustment-country` ON `bt_hijri_calendar_adjustment` (`country_id`);

UPDATE `bt_hijri_calendar_adjustment`
SET `country_id` = (SELECT `id` FROM `bt_countries` WHERE `slug` = 'india' LIMIT 1)
WHERE `country_id` IS NULL;

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261019_100000_add_country_to_hijri_calendar_adjustment', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261019_100000_add_country_to_hijri_calendar_adjustment'
);

-- Check: every adjustment should have a country.
--   SELECT a.id, a.title, c.name AS country FROM `bt_hijri_calendar_adjustment` a
--   LEFT JOIN `bt_countries` c ON c.id = a.country_id;

-- Rollback:
--   DROP INDEX `idx-hijri-calendar-adjustment-country` ON `bt_hijri_calendar_adjustment`;
--   ALTER TABLE `bt_hijri_calendar_adjustment` DROP COLUMN `country_id`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261019_100000_add_country_to_hijri_calendar_adjustment';
