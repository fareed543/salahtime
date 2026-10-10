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
