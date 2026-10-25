-- =============================================================================================
-- SalahTime: all pending PRODUCTION database changes (2026-10-07 to 2026-10-19), in one file.
-- Run in Hostinger phpMyAdmin on the production database: Import this file (character set utf-8).
--
-- Every step checks before it changes anything (IF NOT EXISTS / NOT EXISTS), so it is safe to run
-- even if some parts were already applied. Nothing here drops a table or deletes data.
-- Take a backup first (Export > Quick > SQL).
--
-- Fixes, among others:
--   Masjid::latitude unknown property            (2026-10-12 masjid coordinates)
--   MasjidDetail::whatsapp_group_url             (2026-10-19 masjid contacts)
--   Language::is_rtl                             (2026-10-12 app languages)
--   bt_support_ticket_attachment doesn't exist   (2026-10-12 support attachments)
--
-- Requires the 2026-10-10 changes (bt_support_ticket) to be in place already; they are, since
-- support tickets are being saved on production.
-- =============================================================================================

SET NAMES utf8mb4;


-- #############################################################################################
-- 1/7: 2026-10-07_masjid_madhab_images_timing_versions.sql
-- #############################################################################################
-- ---------------------------------------------------------------------------------------------
-- Masjid madhab (Hanafi/Shafi'i), masjid photo slideshow, and versioned salah timings.
-- SQL equivalent of api/migrations/m261007_100000_add_masjid_madhab_images_timing_versions.php,
-- for hosts where `php yii migrate` can't be run (e.g. phpMyAdmin on shared hosting).
--
-- Safe to run more than once: every step checks before it changes anything.
-- Target: MariaDB 10.2+ / MySQL 5.7.8+ (production runs MariaDB 11.8). Table prefix: bt_
-- ---------------------------------------------------------------------------------------------

-- 1. Madhab on the masjid: 'hanafi', 'shafi' or NULL (not set).
ALTER TABLE `bt_masjid`
  ADD COLUMN IF NOT EXISTS `madhab` varchar(10) DEFAULT NULL AFTER `country`;

-- 2. Every timing change is stored as a full snapshot, so earlier timings can be restored.
--    bt_masjid_timing keeps holding the current set.
CREATE TABLE IF NOT EXISTS `bt_masjid_timing_version` (
  `id_masjid_timing_version` int(11) NOT NULL AUTO_INCREMENT,
  `id_masjid` int(11) NOT NULL,
  `version_no` int(11) NOT NULL,
  `timings` text NOT NULL COMMENT 'JSON array of {salah, azan, jamat}',
  `source` varchar(20) NOT NULL DEFAULT 'manual' COMMENT 'manual | capture | restore | admin | initial',
  `image_url` varchar(500) DEFAULT NULL COMMENT 'Timing-board photo this version was read from',
  `restored_from` int(11) DEFAULT NULL,
  `id_customer` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_masjid_timing_version`),
  UNIQUE KEY `idx-masjid-timing-version-masjid-no` (`id_masjid`, `version_no`),
  CONSTRAINT `fk-masjid-timing-version-masjid` FOREIGN KEY (`id_masjid`)
    REFERENCES `bt_masjid` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Masjid photos: stored pre-cropped to 1280x720 (16:9) plus a 480x270 thumbnail.
CREATE TABLE IF NOT EXISTS `bt_masjid_image` (
  `id_masjid_image` int(11) NOT NULL AUTO_INCREMENT,
  `id_masjid` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `thumb_url` varchar(500) NOT NULL,
  `width` int(11) NOT NULL,
  `height` int(11) NOT NULL,
  `size_bytes` int(11) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `id_customer` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_masjid_image`),
  KEY `idx-masjid-image-masjid` (`id_masjid`),
  CONSTRAINT `fk-masjid-image-masjid` FOREIGN KEY (`id_masjid`)
    REFERENCES `bt_masjid` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Version 1 ("Original") for every masjid that already has timings, so the first edit can
--    be undone. Skips masjids that already have a version.
SET SESSION group_concat_max_len = 100000;

INSERT INTO `bt_masjid_timing_version` (`id_masjid`, `version_no`, `timings`, `source`)
SELECT t.`id_masjid`,
       1,
       CONCAT('[', GROUP_CONCAT(
         JSON_OBJECT('salah', t.`salah`, 'azan', IFNULL(t.`azan_time`, ''), 'jamat', IFNULL(t.`jamat_time`, ''))
         ORDER BY t.`sort_order`, t.`id_masjid_timing` SEPARATOR ','
       ), ']'),
       'initial'
FROM `bt_masjid_timing` t
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_masjid_timing_version` v WHERE v.`id_masjid` = t.`id_masjid`
)
GROUP BY t.`id_masjid`;

-- 5. Record the migration as applied, so a later `php yii migrate` won't try to run it again.
INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261007_100000_add_masjid_madhab_images_timing_versions', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261007_100000_add_masjid_madhab_images_timing_versions'
);

-- ---------------------------------------------------------------------------------------------
-- Check (optional): should show the new column, both tables, and one version per masjid with timings.
--   SHOW COLUMNS FROM `bt_masjid` LIKE 'madhab';
--   SELECT COUNT(*) FROM `bt_masjid_timing_version`;
--   SELECT COUNT(DISTINCT `id_masjid`) FROM `bt_masjid_timing`;
--
-- Rollback (only if you need to undo this change; deletes all timing history and photo records):
--   DROP TABLE IF EXISTS `bt_masjid_image`;
--   DROP TABLE IF EXISTS `bt_masjid_timing_version`;
--   ALTER TABLE `bt_masjid` DROP COLUMN `madhab`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261007_100000_add_masjid_madhab_images_timing_versions';
-- ---------------------------------------------------------------------------------------------

-- #############################################################################################
-- 2/7: 2026-10-08_masjid_public_url_slug.sql
-- #############################################################################################
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

-- #############################################################################################
-- 3/7: 2026-10-12_masjid_coordinates.sql
-- #############################################################################################
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

-- #############################################################################################
-- 4/7: 2026-10-12_app_languages.sql
-- #############################################################################################
-- ---------------------------------------------------------------------------------------------
-- App language list managed in the back office (Languages): RTL flag + a row for every language
-- the app ships a translation for. The app's language pickers now read http-language/list.
-- SQL equivalent of api/migrations/m261012_110000_add_rtl_and_app_languages.php.
--
-- Existing rows keep their name, status and sort order (a disabled language stays disabled);
-- only missing languages are added. Safe to run more than once.
-- ---------------------------------------------------------------------------------------------

-- Legacy tables have code varchar(2), too short for "hi-latn".
ALTER TABLE `bt_language` MODIFY `code` varchar(10) NOT NULL;
ALTER TABLE `bt_language` ADD COLUMN IF NOT EXISTS `is_rtl` tinyint(1) NOT NULL DEFAULT 0 AFTER `code`;
ALTER TABLE `bt_language` ADD COLUMN IF NOT EXISTS `native_name` varchar(191) DEFAULT NULL AFTER `name`;
ALTER TABLE `bt_language` ADD COLUMN IF NOT EXISTS `sort_order` int(11) NOT NULL DEFAULT 0 AFTER `status`;
ALTER TABLE `bt_language` ADD COLUMN IF NOT EXISTS `created_at` datetime DEFAULT NULL AFTER `sort_order`;
ALTER TABLE `bt_language` ADD COLUMN IF NOT EXISTS `updated_at` datetime DEFAULT NULL AFTER `created_at`;

DROP TEMPORARY TABLE IF EXISTS `tmp_app_language`;
CREATE TEMPORARY TABLE `tmp_app_language` (
  `code` varchar(10) NOT NULL,
  `name` varchar(191) NOT NULL,
  `native_name` varchar(191) NOT NULL,
  `is_rtl` tinyint(1) NOT NULL,
  `sort_order` int(11) NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `tmp_app_language` (`code`, `name`, `native_name`, `is_rtl`, `sort_order`) VALUES
  ('en', 'English', 'English', 0, 1),
  ('hi', 'Hindi', 'हिन्दी', 0, 2),
  ('hi-latn', 'Hindi (Roman)', 'Hinglish', 0, 3),
  ('te', 'Telugu', 'తెలుగు', 0, 4),
  ('te-latn', 'Telugu (Roman)', 'Tinglish', 0, 5),
  ('ta', 'Tamil', 'தமிழ்', 0, 6),
  ('ar', 'Arabic', 'العربية', 1, 7),
  ('ur', 'Urdu', 'اردو', 1, 8),
  ('fr', 'French', 'Français', 0, 9),
  ('tr', 'Turkish', 'Türkçe', 0, 10),
  ('id', 'Indonesian', 'Bahasa Indonesia', 0, 11),
  ('ms', 'Malay', 'Bahasa Melayu', 0, 12),
  ('es', 'Spanish', 'Español', 0, 13);

-- Existing rows: set the RTL flag and fill a missing native name.
UPDATE `bt_language` l
JOIN `tmp_app_language` t ON t.`code` = l.`code`
SET l.`is_rtl` = t.`is_rtl`,
    l.`native_name` = COALESCE(NULLIF(l.`native_name`, ''), t.`native_name`);

-- Missing rows (older tables have no auto-increment on id_language, so ids are numbered here).
SET @next_id := (SELECT COALESCE(MAX(`id_language`), 0) FROM `bt_language`);
INSERT INTO `bt_language` (`id_language`, `name`, `native_name`, `code`, `is_rtl`, `status`, `sort_order`, `created_at`, `updated_at`)
SELECT (@next_id := @next_id + 1), t.`name`, t.`native_name`, t.`code`, t.`is_rtl`, 1, t.`sort_order`, NOW(), NOW()
FROM `tmp_app_language` t
WHERE NOT EXISTS (SELECT 1 FROM `bt_language` l WHERE l.`code` = t.`code`)
ORDER BY t.`sort_order`;

DROP TEMPORARY TABLE `tmp_app_language`;

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261012_110000_add_rtl_and_app_languages', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261012_110000_add_rtl_and_app_languages'
);

-- Rollback:
--   ALTER TABLE `bt_language` DROP COLUMN `is_rtl`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261012_110000_add_rtl_and_app_languages';

-- #############################################################################################
-- 5/7: 2026-10-12_support_ticket_attachments.sql
-- #############################################################################################
-- ---------------------------------------------------------------------------------------------
-- Support Desk attachments: screenshots/PDFs added to "Report an Issue".
-- SQL equivalent of api/migrations/m261012_120000_create_support_ticket_attachment_table.php.
-- Needs bt_support_ticket (2026-10-10 production SQL) to exist first.
--
-- The files are stored in api/runtime/support-attachments/<ticket id>/ (outside the web root);
-- api/runtime must be writable by PHP, as it already is for logs.
-- Safe to run more than once.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `bt_support_ticket_attachment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `original_name` varchar(190) NOT NULL,
  `stored_name` varchar(80) NOT NULL,
  `mime_type` varchar(60) NOT NULL,
  `size_bytes` int(11) NOT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx-support-ticket-attachment-ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261012_120000_create_support_ticket_attachment_table', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261012_120000_create_support_ticket_attachment_table'
);

-- Rollback:
--   DROP TABLE `bt_support_ticket_attachment`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261012_120000_create_support_ticket_attachment_table';

-- #############################################################################################
-- 6/7: 2026-10-19_hijri_adjustment_country.sql
-- #############################################################################################
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

-- #############################################################################################
-- 7/7: 2026-10-19_masjid_contacts_and_links.sql
-- #############################################################################################
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

-- =============================================================================================
-- Check: this should list all 7 versions below.
-- =============================================================================================
SELECT version, FROM_UNIXTIME(apply_time) AS applied_at
FROM bt_migration
WHERE version IN (
  'm261007_100000_add_masjid_madhab_images_timing_versions',
  'm261008_100000_add_slug_to_masjid_table',
  'm261012_100000_add_coordinates_to_masjid_table',
  'm261012_110000_add_rtl_and_app_languages',
  'm261012_120000_create_support_ticket_attachment_table',
  'm261019_100000_add_country_to_hijri_calendar_adjustment',
  'm261019_120000_add_contacts_and_links_to_masjid_detail'
)
ORDER BY version;
