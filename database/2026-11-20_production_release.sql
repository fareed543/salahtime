-- =============================================================================================
-- SalahTime production release 2026-11-20 — ALL database changes of this release, in order.
-- Commits: 3e583f9 (SEO), a92b765 (CR-023), c038053 (CR-024 + NF-025) on develop/1.0.54.
--
-- BEFORE: take a full backup of the production database (phpMyAdmin > Export, or hPanel backup).
-- RUN:    this whole file once, BEFORE deploying the new API. MariaDB (uses ADD COLUMN IF NOT EXISTS,
--         ROW_NUMBER()). Every part is safe to run more than once (checked twice on the local copy).
-- AFTER:  the SELECTs at the end should show: whatsapp_group_url column, token column, 2 new tables,
--         3 new countries, the city count up by 139, and the 3 migrations recorded.
--
-- Parts:
--   1. CR-024  bt_program.whatsapp_group_url
--   2. NF-025  bt_program_customer.token (+ numbering of existing subscribers), bt_program_day,
--              bt_subscriber_packets.collected_at / method, bt_subscriber_packets_log
--   3. CR-027  3 countries (Bangladesh, Malaysia, Nigeria) + 139 cities into bt_countries / bt_cities
-- No data is deleted or changed except: existing program subscribers get a token number (1, 2, 3 … per
-- program in enrolment order, only where the token is empty).
-- =============================================================================================

-- ############################################################################ 1. CR-024
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

-- ############################################################################ 2. NF-025
-- ---------------------------------------------------------------------------------------------
-- NF-025: packet distribution by QR scan.
--   * bt_program_customer.token   one token per subscriber per program (numbered in enrolment order)
--   * bt_program_day              packets per person, set once per program day
--   * bt_subscriber_packets       + collected_at, method ('scan' | 'manual' | 'edit')
--   * bt_subscriber_packets_log   audit of undone collections
-- SQL equivalent of api/migrations/m261119_130000_nf025_distribution.php.
-- MariaDB 10.4+. Safe to run more than once. Run on dev / production BEFORE deploying the NF-025 API.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE `bt_program_customer`
  ADD COLUMN IF NOT EXISTS `token` int(11) DEFAULT NULL AFTER `status`;

-- Number existing subscribers 1, 2, 3 ... per program in enrolment order (only rows without a token).
UPDATE `bt_program_customer` pc
JOIN (
  SELECT x.id,
         ROW_NUMBER() OVER (PARTITION BY x.id_program ORDER BY x.created_at, x.id)
           + COALESCE((SELECT MAX(y.token) FROM `bt_program_customer` y WHERE y.id_program = x.id_program), 0) AS next_token
  FROM `bt_program_customer` x
  WHERE x.role = 3 AND x.token IS NULL
) numbered ON numbered.id = pc.id
SET pc.token = numbered.next_token;

ALTER TABLE `bt_program_customer`
  ADD UNIQUE INDEX IF NOT EXISTS `uq_program_customer_token` (`id_program`, `token`);

CREATE TABLE IF NOT EXISTS `bt_program_day` (
  `id_program` int(11) NOT NULL,
  `date` date NOT NULL,
  `packets_per_person` int(11) NOT NULL DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_program`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `bt_subscriber_packets`
  ADD COLUMN IF NOT EXISTS `collected_at` datetime DEFAULT NULL AFTER `packets`,
  ADD COLUMN IF NOT EXISTS `method` varchar(10) DEFAULT NULL AFTER `collected_at`;

CREATE TABLE IF NOT EXISTS `bt_subscriber_packets_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_program` int(11) NOT NULL,
  `id_customer` int(11) NOT NULL,
  `date` date NOT NULL,
  `packets` int(11) DEFAULT NULL,
  `token` int(11) DEFAULT NULL,
  `action` varchar(20) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `done_by` int(11) DEFAULT NULL,
  `done_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_packets_log_program_date` (`id_program`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261119_130000_nf025_distribution', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261119_130000_nf025_distribution'
);

-- Rollback:
--   DROP TABLE `bt_subscriber_packets_log`; DROP TABLE `bt_program_day`;
--   ALTER TABLE `bt_subscriber_packets` DROP COLUMN `method`, DROP COLUMN `collected_at`;
--   ALTER TABLE `bt_program_customer` DROP INDEX `uq_program_customer_token`, DROP COLUMN `token`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261119_130000_nf025_distribution';

-- ############################################################################ 3. CR-027
-- ---------------------------------------------------------------------------------------------
-- CR-027: more cities abroad — Bangladesh, Malaysia and Nigeria (new countries) and more cities in the
-- United Kingdom, Canada and the UAE. Source: GeoNames cities15000 (CC BY 4.0), geoname_id kept.
-- Safe to run more than once (skips countries / cities that already exist).
-- After running it: Back office -> Locations -> Release, or the bundled locations.json is used as is.
-- ---------------------------------------------------------------------------------------------

INSERT INTO `bt_countries` (`name`, `code`, `slug`, `timezone`, `is_active`)
SELECT 'Bangladesh', 'BGD', 'bangladesh', 'Asia/Dhaka', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `bt_countries` WHERE `code` = 'BGD' OR `slug` = 'bangladesh');

INSERT INTO `bt_countries` (`name`, `code`, `slug`, `timezone`, `is_active`)
SELECT 'Malaysia', 'MYS', 'malaysia', 'Asia/Kuala_Lumpur', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `bt_countries` WHERE `code` = 'MYS' OR `slug` = 'malaysia');

INSERT INTO `bt_countries` (`name`, `code`, `slug`, `timezone`, `is_active`)
SELECT 'Nigeria', 'NGA', 'nigeria', 'Africa/Lagos', 1 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `bt_countries` WHERE `code` = 'NGA' OR `slug` = 'nigeria');

INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185241, co.id, 'Dhaka', 'Dhaka', 'dhaka', 23.7104000, 90.4074400, 'Asia/Dhaka', 10356500, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'dhaka') OR ci.geoname_id = 1185241);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1205733, co.id, 'Chattogram', 'Chattogram', 'chattogram', 22.3384000, 91.8316800, 'Asia/Dhaka', 3920222, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'chattogram') OR ci.geoname_id = 1205733);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1200109, co.id, 'Gazipur', 'Gazipur', 'gazipur', 23.9984400, 90.4223400, 'Asia/Dhaka', 2674697, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'gazipur') OR ci.geoname_id = 1200109);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1336135, co.id, 'Khulna', 'Khulna', 'khulna', 22.8097900, 89.5643900, 'Asia/Dhaka', 1500689, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'khulna') OR ci.geoname_id = 1336135);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185188, co.id, 'Rangpur', 'Rangpur', 'rangpur', 25.7466400, 89.2516600, 'Asia/Dhaka', 1031388, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'rangpur') OR ci.geoname_id = 1185188);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185128, co.id, 'Rajshahi', 'Rajshahi', 'rajshahi', 24.3740000, 88.6011400, 'Asia/Dhaka', 763580, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'rajshahi') OR ci.geoname_id = 1185128);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185186, co.id, 'Comilla', 'Comilla', 'comilla', 23.4618600, 91.1850300, 'Asia/Dhaka', 634654, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'comilla') OR ci.geoname_id = 1185186);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1337233, co.id, 'Bogura', 'Bogura', 'bogura', 24.8509800, 89.3710800, 'Asia/Dhaka', 421858, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'bogura') OR ci.geoname_id = 1337233);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 7483813, co.id, 'Natore', 'Natore', 'natore', 24.4111200, 88.9867300, 'Asia/Dhaka', 369138, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'natore') OR ci.geoname_id = 7483813);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185117, co.id, 'Narsingdi', 'Narsingdi', 'narsingdi', 23.9229800, 90.7176800, 'Asia/Dhaka', 281080, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'narsingdi') OR ci.geoname_id = 1185117);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1336142, co.id, 'Brāhmanbāria', 'Brahmanbaria', 'brahmanbaria', 23.9746400, 91.1122800, 'Asia/Dhaka', 279485, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'brahmanbaria') OR ci.geoname_id = 1336142);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185281, co.id, 'Bagerhat', 'Bagerhat', 'bagerhat', 22.6565700, 89.7912300, 'Asia/Dhaka', 266388, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'bagerhat') OR ci.geoname_id = 1185281);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1336134, co.id, 'Cox’s Bāzār', 'Cox''s Bazar', 'cox-s-bazar', 21.4397300, 92.0095500, 'Asia/Dhaka', 253788, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'cox-s-bazar') OR ci.geoname_id = 1336134);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1336140, co.id, 'Jessore', 'Jessore', 'jessore', 23.1697100, 89.2137100, 'Asia/Dhaka', 243987, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'jessore') OR ci.geoname_id = 1336140);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185099, co.id, 'Sylhet', 'Sylhet', 'sylhet', 24.8990400, 91.8719800, 'Asia/Dhaka', 237000, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sylhet') OR ci.geoname_id = 1185099);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1735161, co.id, 'Kuala Lumpur', 'Kuala Lumpur', 'kuala-lumpur', 3.1412000, 101.6865300, 'Asia/Kuala_Lumpur', 1453975, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kuala-lumpur') OR ci.geoname_id = 1735161);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1732752, co.id, 'Johor Bahru', 'Johor Bahru', 'johor-bahru', 1.4655000, 103.7578000, 'Asia/Kuala_Lumpur', 858118, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'johor-bahru') OR ci.geoname_id = 1732752);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1735158, co.id, 'Petaling Jaya', 'Petaling Jaya', 'petaling-jaya', 3.1072600, 101.6067100, 'Asia/Kuala_Lumpur', 807879, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'petaling-jaya') OR ci.geoname_id = 1735158);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1734634, co.id, 'Ipoh', 'Ipoh', 'ipoh', 4.5841000, 101.0829000, 'Asia/Kuala_Lumpur', 759952, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'ipoh') OR ci.geoname_id = 1734634);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1732903, co.id, 'Shah Alam', 'Shah Alam', 'shah-alam', 3.0850700, 101.5328100, 'Asia/Kuala_Lumpur', 740750, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'shah-alam') OR ci.geoname_id = 1732903);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1734759, co.id, 'Malacca', 'Malacca', 'malacca', 2.1960000, 102.2405000, 'Asia/Kuala_Lumpur', 579000, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'malacca') OR ci.geoname_id = 1734759);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 10063567, co.id, 'Iskandar Puteri', 'Iskandar Puteri', 'iskandar-puteri', 1.3932400, 103.6232200, 'Asia/Kuala_Lumpur', 575977, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'iskandar-puteri') OR ci.geoname_id = 10063567);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1736376, co.id, 'Kota Bharu', 'Kota Bharu', 'kota-bharu', 6.1236100, 102.2433300, 'Asia/Kuala_Lumpur', 568900, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kota-bharu') OR ci.geoname_id = 1736376);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1735227, co.id, 'Kuantan', 'Kuantan', 'kuantan', 3.8077000, 103.3260000, 'Asia/Kuala_Lumpur', 548014, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kuantan') OR ci.geoname_id = 1735227);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1735498, co.id, 'Sungai Petani', 'Sungai Petani', 'sungai-petani', 5.6470000, 100.4877200, 'Asia/Kuala_Lumpur', 544851, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sungai-petani') OR ci.geoname_id = 1735498);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1732722, co.id, 'Pasir Gudang', 'Pasir Gudang', 'pasir-gudang', 1.4620000, 103.9053000, 'Asia/Kuala_Lumpur', 534659, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'pasir-gudang') OR ci.geoname_id = 1732722);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1733432, co.id, 'Kota Kinabalu', 'Kota Kinabalu', 'kota-kinabalu', 5.9749000, 116.0724000, 'Asia/Kuching', 500421, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kota-kinabalu') OR ci.geoname_id = 1733432);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1734052, co.id, 'Sandakan', 'Sandakan', 'sandakan', 5.8402000, 118.1179000, 'Asia/Kuching', 439050, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sandakan') OR ci.geoname_id = 1734052);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1734705, co.id, 'Kuala Terengganu', 'Kuala Terengganu', 'kuala-terengganu', 5.3302000, 103.1408000, 'Asia/Kuala_Lumpur', 426500, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kuala-terengganu') OR ci.geoname_id = 1734705);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1736309, co.id, 'Alor Setar', 'Alor Setar', 'alor-setar', 6.1210400, 100.3601400, 'Asia/Kuala_Lumpur', 417800, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'alor-setar') OR ci.geoname_id = 1736309);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2332459, co.id, 'Lagos', 'Lagos', 'lagos', 6.4540700, 3.3946700, 'Africa/Lagos', 15388000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'lagos') OR ci.geoname_id = 2332459);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2335204, co.id, 'Kano', 'Kano', 'kano', 12.0001200, 8.5167200, 'Africa/Lagos', 4910000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kano') OR ci.geoname_id = 2335204);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2339354, co.id, 'Ibadan', 'Ibadan', 'ibadan', 7.3775600, 3.9059100, 'Africa/Lagos', 3649000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'ibadan') OR ci.geoname_id = 2339354);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2352778, co.id, 'Abuja', 'Abuja', 'abuja', 9.0578500, 7.4950800, 'Africa/Lagos', 2690000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'abuja') OR ci.geoname_id = 2352778);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2324774, co.id, 'Port Harcourt', 'Port Harcourt', 'port-harcourt', 4.7774200, 7.0134000, 'Africa/Lagos', 2120000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'port-harcourt') OR ci.geoname_id = 2324774);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2335727, co.id, 'Kaduna', 'Kaduna', 'kaduna', 10.5264100, 7.4387900, 'Africa/Lagos', 1850000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kaduna') OR ci.geoname_id = 2335727);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2347283, co.id, 'Benin City', 'Benin City', 'benin-city', 6.3381500, 5.6257500, 'Africa/Lagos', 1782000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'benin-city') OR ci.geoname_id = 2347283);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2326016, co.id, 'Onitsha', 'Onitsha', 'onitsha', 6.1497800, 6.7856900, 'Africa/Lagos', 1553000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'onitsha') OR ci.geoname_id = 2326016);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2353151, co.id, 'Aba', 'Aba', 'aba', 5.1065800, 7.3666700, 'Africa/Lagos', 1160000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'aba') OR ci.geoname_id = 2353151);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2331447, co.id, 'Maiduguri', 'Maiduguri', 'maiduguri', 11.8469200, 13.1571200, 'Africa/Lagos', 1110000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'maiduguri') OR ci.geoname_id = 2331447);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2337639, co.id, 'Ilorin', 'Ilorin', 'ilorin', 8.4966400, 4.5421400, 'Africa/Lagos', 1080000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'ilorin') OR ci.geoname_id = 2337639);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2322911, co.id, 'Sokoto', 'Sokoto', 'sokoto', 13.0626900, 5.2432200, 'Africa/Lagos', 1040000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sokoto') OR ci.geoname_id = 2322911);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2335953, co.id, 'Jos', 'Jos', 'jos', 9.9284900, 8.8921200, 'Africa/Lagos', 1040000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'jos') OR ci.geoname_id = 2335953);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2317765, co.id, 'Zaria', 'Zaria', 'zaria', 11.1112800, 7.7227000, 'Africa/Lagos', 980000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'zaria') OR ci.geoname_id = 2317765);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2343279, co.id, 'Enugu', 'Enugu', 'enugu', 6.4413200, 7.4988300, 'Africa/Lagos', 950000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'enugu') OR ci.geoname_id = 2343279);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2319133, co.id, 'Warri', 'Warri', 'warri', 5.5173700, 5.7500600, 'Africa/Lagos', 910000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'warri') OR ci.geoname_id = 2319133);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2325200, co.id, 'Oyo', 'Oyo', 'oyo', 7.8536700, 3.9323500, 'Africa/Lagos', 736072, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'oyo') OR ci.geoname_id = 2325200);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2352947, co.id, 'Abeokuta', 'Abeokuta', 'abeokuta', 7.1557100, 3.3450900, 'Africa/Lagos', 735000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'abeokuta') OR ci.geoname_id = 2352947);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2350841, co.id, 'Akure', 'Akure', 'akure', 7.2525600, 5.1931200, 'Africa/Lagos', 730000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'akure') OR ci.geoname_id = 2350841);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2347470, co.id, 'Bauchi', 'Bauchi', 'bauchi', 10.3103200, 9.8438800, 'Africa/Lagos', 693700, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'bauchi') OR ci.geoname_id = 2347470);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2334802, co.id, 'Katsina', 'Katsina', 'katsina', 12.9908200, 7.6017700, 'Africa/Lagos', 670000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'katsina') OR ci.geoname_id = 2334802);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2325590, co.id, 'Osogbo', 'Osogbo', 'osogbo', 7.7710400, 4.5569800, 'Africa/Lagos', 645000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'osogbo') OR ci.geoname_id = 2325590);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2338900, co.id, 'Ile-Ife', 'Ile-Ife', 'ile-ife', 7.4824000, 4.5603200, 'Africa/Lagos', 560000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'ile-ife') OR ci.geoname_id = 2338900);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2652221, co.id, 'Coventry', 'Coventry', 'coventry', 52.4065600, -1.5121700, 'Europe/London', 345324, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'coventry') OR ci.geoname_id = 2652221);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2641170, co.id, 'Nottingham', 'Nottingham', 'nottingham', 52.9536000, -1.1504700, 'Europe/London', 323632, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'nottingham') OR ci.geoname_id = 2641170);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2639577, co.id, 'Reading', 'Reading', 'reading', 51.4562500, -0.9711300, 'Europe/London', 318014, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'reading') OR ci.geoname_id = 2639577);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2645425, co.id, 'Kingston upon Hull', 'Kingston upon Hull', 'kingston-upon-hull', 53.7446000, -0.3352500, 'Europe/London', 314018, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kingston-upon-hull') OR ci.geoname_id = 2645425);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2639912, co.id, 'Preston', 'Preston', 'preston', 53.7628200, -2.7045200, 'Europe/London', 313332, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'preston') OR ci.geoname_id = 2639912);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2636432, co.id, 'Swansea', 'Swansea', 'swansea', 51.6207900, -3.9432300, 'Europe/London', 300352, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'swansea') OR ci.geoname_id = 2636432);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2641673, co.id, 'Newcastle upon Tyne', 'Newcastle upon Tyne', 'newcastle-upon-tyne', 54.9732800, -1.6139600, 'Europe/London', 300125, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'newcastle-upon-tyne') OR ci.geoname_id = 2641673);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2637433, co.id, 'Southend-on-Sea', 'Southend-on-Sea', 'southend-on-sea', 51.5378200, 0.7143300, 'Europe/London', 295310, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'southend-on-sea') OR ci.geoname_id = 2637433);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2654710, co.id, 'Brighton', 'Brighton', 'brighton', 50.8283800, -0.1394700, 'Europe/London', 283870, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'brighton') OR ci.geoname_id = 2654710);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2651347, co.id, 'Derby', 'Derby', 'derby', 52.9227700, -1.4766300, 'Europe/London', 270468, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'derby') OR ci.geoname_id = 2651347);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2637487, co.id, 'Southampton', 'Southampton', 'southampton', 50.9039500, -1.4042800, 'Europe/London', 269781, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'southampton') OR ci.geoname_id = 2637487);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2633691, co.id, 'Wolverhampton', 'Wolverhampton', 'wolverhampton', 52.5854700, -2.1229600, 'Europe/London', 263700, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'wolverhampton') OR ci.geoname_id = 2633691);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2640194, co.id, 'Plymouth', 'Plymouth', 'plymouth', 50.3715300, -4.1430500, 'Europe/London', 260203, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'plymouth') OR ci.geoname_id = 2640194);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2636841, co.id, 'Stoke-on-Trent', 'Stoke-on-Trent', 'stoke-on-trent', 53.0041500, -2.1853800, 'Europe/London', 258366, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'stoke-on-trent') OR ci.geoname_id = 2636841);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2642465, co.id, 'Milton Keynes', 'Milton Keynes', 'milton-keynes', 52.0417200, -0.7558300, 'Europe/London', 256385, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'milton-keynes') OR ci.geoname_id = 2642465);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2641430, co.id, 'Northampton', 'Northampton', 'northampton', 52.2500000, -0.8833300, 'Europe/London', 245899, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'northampton') OR ci.geoname_id = 2641430);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2641022, co.id, 'Oldham', 'Oldham', 'oldham', 53.5405100, -2.1183000, 'Europe/London', 237110, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'oldham') OR ci.geoname_id = 2641022);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2643339, co.id, 'Luton', 'Luton', 'luton', 51.8796700, -0.4174800, 'Europe/London', 225262, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'luton') OR ci.geoname_id = 2643339);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2639996, co.id, 'Portsmouth', 'Portsmouth', 'portsmouth', 50.7989900, -1.0912500, 'Europe/London', 208100, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'portsmouth') OR ci.geoname_id = 2639996);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2636389, co.id, 'Swindon', 'Swindon', 'swindon', 51.5579700, -1.7811600, 'Europe/London', 201669, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'swindon') OR ci.geoname_id = 2636389);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2650839, co.id, 'Dudley', 'Dudley', 'dudley', 52.5000000, -2.0833300, 'Europe/London', 199059, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'dudley') OR ci.geoname_id = 2650839);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2657832, co.id, 'Aberdeen', 'Aberdeen', 'aberdeen', 57.1436900, -2.0981400, 'Europe/London', 198590, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'aberdeen') OR ci.geoname_id = 2657832);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2638785, co.id, 'St Helens', 'St Helens', 'st-helens', 53.4500000, -2.7333300, 'Europe/London', 183200, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'st-helens') OR ci.geoname_id = 2638785);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6324729, co.id, 'Halifax', 'Halifax', 'halifax', 44.6426900, -63.5768800, 'America/Halifax', 471559, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'halifax') OR ci.geoname_id = 6324729);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6050610, co.id, 'Laval', 'Laval', 'laval', 45.5699500, -73.6920000, 'America/Toronto', 438366, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'laval') OR ci.geoname_id = 6050610);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6058560, co.id, 'London', 'London', 'london', 42.9833900, -81.2330400, 'America/Toronto', 422324, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'london') OR ci.geoname_id = 6058560);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6066513, co.id, 'Markham', 'Markham', 'markham', 43.8668200, -79.2663000, 'America/Toronto', 338503, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'markham') OR ci.geoname_id = 6066513);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6173577, co.id, 'Vaughan', 'Vaughan', 'vaughan', 43.8361000, -79.4982700, 'America/Toronto', 323103, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'vaughan') OR ci.geoname_id = 6173577);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5959974, co.id, 'Gatineau', 'Gatineau', 'gatineau', 45.4772300, -75.7016400, 'America/Toronto', 300045, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'gatineau') OR ci.geoname_id = 5959974);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6174041, co.id, 'Victoria', 'Victoria', 'victoria', 48.4359000, -123.3515500, 'America/Vancouver', 289625, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'victoria') OR ci.geoname_id = 6174041);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6141256, co.id, 'Saskatoon', 'Saskatoon', 'saskatoon', 52.1323800, -106.6689200, 'America/Regina', 266141, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'saskatoon') OR ci.geoname_id = 6141256);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5992996, co.id, 'Kitchener', 'Kitchener', 'kitchener', 43.4253700, -80.5112000, 'America/Toronto', 256885, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kitchener') OR ci.geoname_id = 5992996);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5911606, co.id, 'Burnaby', 'Burnaby', 'burnaby', 49.2663600, -122.9526300, 'America/Vancouver', 249125, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'burnaby') OR ci.geoname_id = 5911606);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6182962, co.id, 'Windsor', 'Windsor', 'windsor', 42.3000800, -83.0165400, 'America/Toronto', 229660, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'windsor') OR ci.geoname_id = 6182962);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6059891, co.id, 'Longueuil', 'Longueuil', 'longueuil', 45.5152000, -73.4681800, 'America/Toronto', 229330, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'longueuil') OR ci.geoname_id = 6059891);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6119109, co.id, 'Regina', 'Regina', 'regina', 50.4500800, -104.6178000, 'America/Regina', 226404, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'regina') OR ci.geoname_id = 6119109);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6092122, co.id, 'Oakville', 'Oakville', 'oakville', 43.4501100, -79.6829200, 'America/Toronto', 213759, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'oakville') OR ci.geoname_id = 6092122);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6122085, co.id, 'Richmond', 'Richmond', 'richmond', 49.1700300, -123.1368300, 'America/Vancouver', 209937, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'richmond') OR ci.geoname_id = 6122085);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6122091, co.id, 'Richmond Hill', 'Richmond Hill', 'richmond-hill', 43.8711100, -79.4372500, 'America/Toronto', 202022, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'richmond-hill') OR ci.geoname_id = 6122091);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5911592, co.id, 'Burlington', 'Burlington', 'burlington', 43.3862100, -79.8371300, 'America/Toronto', 186948, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'burlington') OR ci.geoname_id = 5911592);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185162, co.id, 'Mymensingh', 'Mymensingh', 'mymensingh', 24.7563600, 90.4064600, 'Asia/Dhaka', 225126, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'mymensingh') OR ci.geoname_id = 1185162);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1336137, co.id, 'Barishal', 'Barishal', 'barishal', 22.7049700, 90.3701300, 'Asia/Dhaka', 202242, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'barishal') OR ci.geoname_id = 1336137);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1185155, co.id, 'Narayanganj', 'Narayanganj', 'narayanganj', 23.6135200, 90.5029800, 'Asia/Dhaka', 223622, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'narayanganj') OR ci.geoname_id = 1185155);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1336144, co.id, 'Tangail', 'Tangail', 'tangail', 24.2498400, 89.9165500, 'Asia/Dhaka', 180144, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'tangail') OR ci.geoname_id = 1336144);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1203891, co.id, 'Dinajpur', 'Dinajpur', 'dinajpur', 25.6274500, 88.6377900, 'Asia/Dhaka', 206234, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'dinajpur') OR ci.geoname_id = 1203891);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1203344, co.id, 'Farīdpur', 'Faridpur', 'faridpur', 23.6061200, 89.8406400, 'Asia/Dhaka', 112187, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'faridpur') OR ci.geoname_id = 1203344);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1336143, co.id, 'Pābna', 'Pabna', 'pabna', 24.0064400, 89.2372000, 'Asia/Dhaka', 186781, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'pabna') OR ci.geoname_id = 1336143);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1336136, co.id, 'Bhola', 'Bhola', 'bhola', 22.6875900, 90.6440300, 'Asia/Dhaka', 99079, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'bhola') OR ci.geoname_id = 1336136);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1337249, co.id, 'Kishorganj', 'Kishorganj', 'kishorganj', 24.4394400, 90.7829100, 'Asia/Dhaka', 90690, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kishorganj') OR ci.geoname_id = 1337249);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1207337, co.id, 'Chāndpur', 'Chandpur', 'chandpur', 23.2271400, 90.6543300, 'Asia/Dhaka', 212203, 1
FROM `bt_countries` co WHERE co.slug = 'bangladesh'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'chandpur') OR ci.geoname_id = 1207337);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1735106, co.id, 'George Town', 'George Town', 'george-town', 5.4112300, 100.3354300, 'Asia/Kuala_Lumpur', 158336, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'george-town') OR ci.geoname_id = 1735106);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1735634, co.id, 'Kuching', 'Kuching', 'kuching', 1.5500000, 110.3333300, 'Asia/Kuching', 402738, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kuching') OR ci.geoname_id = 1735634);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1734810, co.id, 'Seremban', 'Seremban', 'seremban', 2.7297000, 101.9381000, 'Asia/Kuala_Lumpur', 372917, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'seremban') OR ci.geoname_id = 1734810);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1732905, co.id, 'Klang', 'Klang', 'klang', 3.0366700, 101.4433300, 'Asia/Kuala_Lumpur', 240016, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'klang') OR ci.geoname_id = 1732905);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 10941913, co.id, 'Kajang', 'Kajang', 'kajang', 2.9942400, 101.7887500, 'Asia/Kuala_Lumpur', 236240, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kajang') OR ci.geoname_id = 10941913);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6697380, co.id, 'Putrajaya', 'Putrajaya', 'putrajaya', 2.9352700, 101.6911200, 'Asia/Kuala_Lumpur', 50000, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'putrajaya') OR ci.geoname_id = 6697380);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 8504423, co.id, 'Subang Jaya', 'Subang Jaya', 'subang-jaya', 3.0438400, 101.5806200, 'Asia/Kuala_Lumpur', 708296, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'subang-jaya') OR ci.geoname_id = 8504423);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1738050, co.id, 'Miri', 'Miri', 'miri', 4.3992800, 113.9916300, 'Asia/Kuching', 300543, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'miri') OR ci.geoname_id = 1738050);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1734199, co.id, 'Tawau', 'Tawau', 'tawau', 4.2448200, 117.8911500, 'Asia/Kuching', 372615, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'tawau') OR ci.geoname_id = 1734199);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1735076, co.id, 'Butterworth', 'Butterworth', 'butterworth', 5.3991000, 100.3638200, 'Asia/Kuala_Lumpur', 107591, 1
FROM `bt_countries` co WHERE co.slug = 'malaysia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'butterworth') OR ci.geoname_id = 1735076);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2325330, co.id, 'Owerri', 'Owerri', 'owerri', 5.4836300, 7.0332500, 'Africa/Lagos', 545000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'owerri') OR ci.geoname_id = 2325330);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2319480, co.id, 'Uyo', 'Uyo', 'uyo', 5.0512700, 7.9335000, 'Africa/Lagos', 436606, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'uyo') OR ci.geoname_id = 2319480);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2346229, co.id, 'Calabar', 'Calabar', 'calabar', 4.9589300, 8.3269500, 'Africa/Lagos', 540000, 1
FROM `bt_countries` co WHERE co.slug = 'nigeria'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'calabar') OR ci.geoname_id = 2346229);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2655524, co.id, 'Blackburn', 'Blackburn', 'blackburn', 53.7500000, -2.4833300, 'Europe/London', 146521, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'blackburn') OR ci.geoname_id = 2655524);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2655237, co.id, 'Bolton', 'Bolton', 'bolton', 53.5833300, -2.4333300, 'Europe/London', 141331, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'bolton') OR ci.geoname_id = 2655237);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2646458, co.id, 'Huddersfield', 'Huddersfield', 'huddersfield', 53.6490400, -1.7841600, 'Europe/London', 149017, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'huddersfield') OR ci.geoname_id = 2646458);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2639272, co.id, 'Rochdale', 'Rochdale', 'rochdale', 53.6176600, -2.1552000, 'Europe/London', 97550, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'rochdale') OR ci.geoname_id = 2639272);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2637627, co.id, 'Slough', 'Slough', 'slough', 51.5094900, -0.5954100, 'Europe/London', 164793, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'slough') OR ci.geoname_id = 2637627);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 2651286, co.id, 'Dewsbury', 'Dewsbury', 'dewsbury', 53.6907600, -1.6290700, 'Europe/London', 61035, 1
FROM `bt_countries` co WHERE co.slug = 'united-kingdom'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'dewsbury') OR ci.geoname_id = 2651286);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6094578, co.id, 'Oshawa', 'Oshawa', 'oshawa', 43.9001200, -78.8495700, 'America/Toronto', 175383, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'oshawa') OR ci.geoname_id = 6094578);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 291696, co.id, 'Khor Fakkan', 'Khor Fakkan', 'khor-fakkan', 25.3313200, 56.3419900, 'Asia/Dubai', 40677, 1
FROM `bt_countries` co WHERE co.slug = 'united-arab-emirates'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'khor-fakkan') OR ci.geoname_id = 291696);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 291763, co.id, 'Kalbā', 'Kalba', 'kalba', 25.0513000, 56.3542200, 'Asia/Dubai', 37545, 1
FROM `bt_countries` co WHERE co.slug = 'united-arab-emirates'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kalba') OR ci.geoname_id = 291763);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 292231, co.id, 'Dibba Al-Fujairah', 'Dibba Al-Fujairah', 'dibba-al-fujairah', 25.5924600, 56.2617600, 'Asia/Dubai', 30000, 1
FROM `bt_countries` co WHERE co.slug = 'united-arab-emirates'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'dibba-al-fujairah') OR ci.geoname_id = 292231);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 292688, co.id, 'Ar Ruways', 'Ar Ruways', 'ar-ruways', 24.1102800, 52.7305600, 'Asia/Dubai', 25000, 1
FROM `bt_countries` co WHERE co.slug = 'united-arab-emirates'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'ar-ruways') OR ci.geoname_id = 292688);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1176615, co.id, 'Islamabad', 'Islamabad', 'islamabad', 33.7214800, 73.0432900, 'Asia/Karachi', 601600, 1
FROM `bt_countries` co WHERE co.slug = 'pakistan'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'islamabad') OR ci.geoname_id = 1176615);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1166993, co.id, 'Rawalpindi', 'Rawalpindi', 'rawalpindi', 33.5973300, 73.0479000, 'Asia/Karachi', 3357612, 1
FROM `bt_countries` co WHERE co.slug = 'pakistan'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'rawalpindi') OR ci.geoname_id = 1166993);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 109353, co.id, 'Al Kharj', 'Al Kharj', 'al-kharj', 24.1554100, 47.3345700, 'Asia/Riyadh', 425300, 1
FROM `bt_countries` co WHERE co.slug = 'saudi-arabia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'al-kharj') OR ci.geoname_id = 109353);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 105072, co.id, 'Khamis Mushait', 'Khamis Mushait', 'khamis-mushait', 18.3000000, 42.7333300, 'Asia/Riyadh', 387553, 1
FROM `bt_countries` co WHERE co.slug = 'saudi-arabia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'khamis-mushait') OR ci.geoname_id = 105072);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1649378, co.id, 'Bekasi', 'Bekasi', 'bekasi', -6.2349000, 106.9896000, 'Asia/Jakarta', 2648272, 1
FROM `bt_countries` co WHERE co.slug = 'indonesia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'bekasi') OR ci.geoname_id = 1649378);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1645524, co.id, 'Depok', 'Depok', 'depok', -6.4000000, 106.8186100, 'Asia/Jakarta', 2163635, 1
FROM `bt_countries` co WHERE co.slug = 'indonesia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'depok') OR ci.geoname_id = 1645524);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 1625084, co.id, 'Tangerang', 'Tangerang', 'tangerang', -6.1780600, 106.6300000, 'Asia/Jakarta', 1927815, 1
FROM `bt_countries` co WHERE co.slug = 'indonesia'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'tangerang') OR ci.geoname_id = 1625084);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4160021, co.id, 'Jacksonville', 'Jacksonville', 'jacksonville', 30.3321800, -81.6556500, 'America/New_York', 1009833, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'jacksonville') OR ci.geoname_id = 4160021);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4691930, co.id, 'Fort Worth', 'Fort Worth', 'fort-worth', 32.7254100, -97.3208500, 'America/Chicago', 1008106, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'fort-worth') OR ci.geoname_id = 4691930);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 315368, co.id, 'Erzurum', 'Erzurum', 'erzurum', 39.9086100, 41.2769400, 'Europe/Istanbul', 767848, 1
FROM `bt_countries` co WHERE co.slug = 'turkiye'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'erzurum') OR ci.geoname_id = 315368);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 3003796, co.id, 'Le Havre', 'Le Havre', 'le-havre', 49.4934600, 0.1078500, 'Europe/Paris', 185972, 1
FROM `bt_countries` co WHERE co.slug = 'france'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'le-havre') OR ci.geoname_id = 3003796);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 288967, co.id, 'Seeb', 'Seeb', 'seeb', 23.6702700, 58.1891100, 'Asia/Muscat', 470878, 1
FROM `bt_countries` co WHERE co.slug = 'oman'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'seeb') OR ci.geoname_id = 288967);

-- ############################################################################ Checks
SHOW COLUMNS FROM `bt_program` LIKE 'whatsapp_group_url';
SHOW COLUMNS FROM `bt_program_customer` LIKE 'token';
SHOW TABLES LIKE 'bt_program_day';
SHOW TABLES LIKE 'bt_subscriber_packets_log';
SELECT `name`, `code`, `timezone` FROM `bt_countries` WHERE `code` IN ('BGD', 'MYS', 'NGA');
SELECT COUNT(*) AS cities FROM `bt_cities`;
SELECT `version` FROM `bt_migration` WHERE `version` IN
  ('m261119_120000_cr024_program_whatsapp', 'm261119_130000_nf025_distribution');
