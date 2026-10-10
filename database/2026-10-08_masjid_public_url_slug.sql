-- ---------------------------------------------------------------------------------------------
-- Public, SEO-friendly masjid URLs: /masjid/<city_slug>/<slug>, e.g. /masjid/hyderabad/masjid-e-noor
-- SQL equivalent of api/migrations/m261008_100000_add_slug_to_masjid_table.php.
-- Run AFTER 2026-10-07_masjid_madhab_images_timing_versions.sql (it places the columns after `madhab`).
--
-- The slugs themselves are filled in by the API (app\components\MasjidSlug) the first time each
-- masjid is listed or opened, so after running this, open the masjid list once.
-- Safe to run more than once.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE `bt_masjid`
  ADD COLUMN IF NOT EXISTS `city_slug` varchar(160) DEFAULT NULL AFTER `madhab`,
  ADD COLUMN IF NOT EXISTS `slug` varchar(160) DEFAULT NULL AFTER `city_slug`;

CREATE UNIQUE INDEX IF NOT EXISTS `idx-masjid-city-slug-slug` ON `bt_masjid` (`city_slug`, `slug`);

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261008_100000_add_slug_to_masjid_table', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261008_100000_add_slug_to_masjid_table'
);

-- Rollback:
--   DROP INDEX `idx-masjid-city-slug-slug` ON `bt_masjid`;
--   ALTER TABLE `bt_masjid` DROP COLUMN `slug`, DROP COLUMN `city_slug`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261008_100000_add_slug_to_masjid_table';
