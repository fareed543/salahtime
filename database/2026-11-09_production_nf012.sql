-- ================================================================================================
-- SalahTime — PRODUCTION database changes for NF-012 (Sehri & Iftar programs), 2026-11-09
-- ================================================================================================
--
-- What it does (nothing is dropped; existing rows are kept):
--   Customers   employment status, gender confirmation flag, "profile updated by" columns
--   Programs    range in km + "open to" (brothers / sisters / both)
--   Members     added-by + enrolled / waitlisted; one row per program + member + role
--   Packets     packets text -> whole number, date -> day, recorded-by; one row per program + member + day
--   History     new table bt_customer_profile_history (profile changes made by a program team)
--   Areas       city link + location; an area name is unique within its city; "Tauheed" -> Bengaluru
--
-- Tested 2026-11-09 on the production snapshot (backup salahtime-production-copy-before-2026-11-09.sql):
--   ran twice with no errors; 62 packet rows / 191 packets and 345 program members unchanged.
--
-- ORDER:  1. database/2026-11-09_production.sql (locations) — if not run yet
--         2. THIS FILE
--         3. Deploy the API
--         4. database/2026-11-09_production_reset_logins.sql (signs everyone out once)
--         5. Release website + Android app
-- BEFORE: phpMyAdmin > Export > Quick > SQL — full backup of the production database.
-- HOW:    In phpMyAdmin click the PRODUCTION database in the left panel first, then its SQL tab
--         ("Run SQL query/queries on database <name>"), paste this file, Go.
-- Safe to run more than once. MariaDB 10.3+ (production runs MariaDB 11.8).
-- ================================================================================================

-- Guard (read only): fails when the wrong database is selected, so nothing below runs.
SELECT DATABASE() AS current_database, COUNT(*) AS programs_now FROM bt_program;

-- 1. Customer: employment status, gender confirmation (existing users confirm once), who last
--    changed the profile when it was a program volunteer / admin.
ALTER TABLE `bt_customer`
  ADD COLUMN IF NOT EXISTS `employment_status` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `gender_confirmed` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `profile_updated_by` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `profile_updated_at` datetime DEFAULT NULL;

-- Free-text masjid names that match exactly one masjid become that masjid's id. Anything else is
-- left as typed; the profile asks the user to pick the masjid from the list.
UPDATE `bt_customer` c
JOIN (
  SELECT LOWER(TRIM(`name`)) AS n, MIN(`id`) AS id
  FROM `bt_masjid`
  GROUP BY LOWER(TRIM(`name`))
  HAVING COUNT(*) = 1
) m ON m.n = LOWER(TRIM(c.`masjid`))
SET c.`masjid` = m.id
WHERE c.`masjid` IS NOT NULL AND c.`masjid` <> '' AND c.`masjid` NOT REGEXP '^[0-9]+$';

-- 2. Program: range for "Programs near you" and who it is open to.
ALTER TABLE `bt_program`
  ADD COLUMN IF NOT EXISTS `radius_km` int(11) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS `open_to` varchar(10) NOT NULL DEFAULT 'both';

-- 3. Program members: who added them, enrolled or waitlisted; one row per program+member+role.
ALTER TABLE `bt_program_customer`
  ADD COLUMN IF NOT EXISTS `added_by` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `status` varchar(12) NOT NULL DEFAULT 'enrolled';

DELETE pc FROM `bt_program_customer` pc
JOIN `bt_program_customer` keep
  ON keep.`id_program` = pc.`id_program` AND keep.`id_customer` = pc.`id_customer`
 AND keep.`role` = pc.`role` AND keep.`id` < pc.`id`;

ALTER TABLE `bt_program_customer`
  ADD UNIQUE KEY IF NOT EXISTS `uq_program_customer_role` (`id_program`, `id_customer`, `role`);

-- 4. Packets: a whole number per program + member + day, and who entered it.
UPDATE `bt_subscriber_packets` SET `packets` = '0' WHERE `packets` NOT REGEXP '^[0-9]+$';

ALTER TABLE `bt_subscriber_packets`
  MODIFY `packets` int(11) NOT NULL DEFAULT 0,
  MODIFY `date` date NOT NULL,
  ADD COLUMN IF NOT EXISTS `recorded_by` int(11) DEFAULT NULL;

DELETE sp FROM `bt_subscriber_packets` sp
JOIN `bt_subscriber_packets` newer
  ON newer.`id_program` = sp.`id_program` AND newer.`id_customer` = sp.`id_customer`
 AND newer.`date` = sp.`date` AND newer.`id` > sp.`id`;

ALTER TABLE `bt_subscriber_packets`
  ADD UNIQUE KEY IF NOT EXISTS `uq_packets_program_customer_date` (`id_program`, `id_customer`, `date`);

-- 5. Profile changes made by a program's volunteers / admin (one row per changed field).
CREATE TABLE IF NOT EXISTS `bt_customer_profile_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_customer` int(11) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `id_program` int(11) DEFAULT NULL,
  `field` varchar(40) NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx-profile-history-customer` (`id_customer`, `changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Areas (halqa) are shared and picked by type-ahead on the program form (NF-012 rev, 2026-11-09):
--    each area belongs to one city from bt_cities; an area name is unique within its city.
ALTER TABLE `bt_halqa`
  ADD COLUMN IF NOT EXISTS `id_city` bigint(20) DEFAULT NULL,
  -- Where the area is: set from the creator's location; used by "Programs near you" when it has no masjids.
  ADD COLUMN IF NOT EXISTS `latitude` decimal(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `longitude` decimal(10,7) DEFAULT NULL;

-- Existing areas whose free-text city matches exactly one city get that city.
UPDATE `bt_halqa` h
JOIN (
  SELECT LOWER(TRIM(`name`)) AS n, MIN(`id`) AS id FROM `bt_cities` GROUP BY LOWER(TRIM(`name`)) HAVING COUNT(*) = 1
) c ON c.n = LOWER(TRIM(h.`city`))
SET h.`id_city` = c.id
WHERE h.`id_city` IS NULL;

-- Merge duplicates (same name, same city) into the oldest area before adding the unique key.
UPDATE `bt_program` p
JOIN `bt_halqa` dup ON dup.`id` = p.`id_halqa`
JOIN `bt_halqa` keep ON keep.`id_city` = dup.`id_city` AND LOWER(TRIM(keep.`name`)) = LOWER(TRIM(dup.`name`)) AND keep.`id` < dup.`id`
SET p.`id_halqa` = keep.`id`;
UPDATE IGNORE `bt_halqa_masjid` hm
JOIN `bt_halqa` dup ON dup.`id` = hm.`id_halqa`
JOIN `bt_halqa` keep ON keep.`id_city` = dup.`id_city` AND LOWER(TRIM(keep.`name`)) = LOWER(TRIM(dup.`name`)) AND keep.`id` < dup.`id`
SET hm.`id_halqa` = keep.`id`;
DELETE dup FROM `bt_halqa` dup
JOIN `bt_halqa` keep ON keep.`id_city` = dup.`id_city` AND LOWER(TRIM(keep.`name`)) = LOWER(TRIM(dup.`name`)) AND keep.`id` < dup.`id`;

ALTER TABLE `bt_halqa`
  ADD UNIQUE KEY IF NOT EXISTS `uq_halqa_city_name` (`id_city`, `name`);

-- 7. Data fix: the area "Tauheed" was saved with the city "q"; its masjids are all in Bengaluru.
UPDATE `bt_halqa`
SET `id_city` = (SELECT `id` FROM `bt_cities` WHERE `name` = 'Bengaluru' ORDER BY `id` LIMIT 1),
    `city` = 'Bengaluru'
WHERE `name` = 'Tauheed' AND `city` = 'q' AND `id_city` IS NULL
  AND EXISTS (SELECT 1 FROM `bt_cities` WHERE `name` = 'Bengaluru');

-- 8. Record the matching migration, so `php yii migrate` does not run it again.
INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261109_120000_nf012_programs', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261109_120000_nf012_programs'
);

-- ================================================================================================
-- Checks (read only). Expected on production as of 2026-11-09:
--   packet_rows 62, packets_total 191, members 345, history table exists, Tauheed has id_city set.
-- ================================================================================================
SELECT COUNT(*) AS packet_rows, SUM(packets) AS packets_total FROM bt_subscriber_packets;
SELECT COUNT(*) AS members FROM bt_program_customer;
SELECT COUNT(*) AS history_rows FROM bt_customer_profile_history;
SELECT id, name, city, id_city FROM bt_halqa;
