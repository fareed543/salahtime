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
