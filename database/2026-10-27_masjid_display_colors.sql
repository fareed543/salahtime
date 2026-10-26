-- ---------------------------------------------------------------------------------------------
-- Masjid display colours (CR-002): background, card and highlight colours the masjid owner picks
-- for the masjid's display screens, as JSON {"bg":"#rrggbb","card":"#rrggbb","accent":"#rrggbb"}.
-- SQL equivalent of api/migrations/m261027_100000_add_display_colors_to_masjid_table.php.
--
-- NULL (every existing masjid) keeps the display's built-in themes. Safe to run more than once.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE `bt_masjid`
  ADD COLUMN IF NOT EXISTS `display_colors` varchar(64) DEFAULT NULL AFTER `madhab`;

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261027_100000_add_display_colors_to_masjid_table', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261027_100000_add_display_colors_to_masjid_table'
);

-- Rollback:
--   ALTER TABLE `bt_masjid` DROP COLUMN `display_colors`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261027_100000_add_display_colors_to_masjid_table';
