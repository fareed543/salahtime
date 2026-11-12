-- ---------------------------------------------------------------------------------------------
-- NF-015 Sunnah Shorts: categories (book chapters), reference books, cards, card references and
-- per-device likes. SQL equivalent of api/migrations/m261112_100000_nf015_sunnah_shorts.php.
--
-- Safe to run more than once (CREATE TABLE IF NOT EXISTS, INSERT IGNORE).
-- BEFORE on dev/prod: phpMyAdmin > Export > Quick > SQL (full backup).
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `bt_sunnah_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL COMMENT 'JSON {"en": "...", "<lang>": "..."}',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bt_sunnah_reference_book` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx-sunnah-book-name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `bt_sunnah_reference_book` (`name`, `sort_order`, `active`) VALUES
  ('Tirmizi', 1, 1), ('Mishkaat', 2, 1), ('Ibne Maaja', 3, 1), ('Eela us Sunan', 4, 1), ('Ithaf', 5, 1),
  ('Bukhari', 6, 1), ('Muslim', 7, 1), ('Abu Dawood', 8, 1), ('Nasai', 9, 1);

CREATE TABLE IF NOT EXISTS `bt_sunnah_card` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `headline` text NOT NULL COMMENT 'JSON per language; *words* are shown in the accent colour',
  `body` text NOT NULL COMMENT 'JSON per language',
  `zikr` text DEFAULT NULL COMMENT 'JSON {"arabic", "transliteration", "meaning": {lang: text}}',
  `template` varchar(10) NOT NULL DEFAULT 't01',
  `image_url` varchar(500) DEFAULT NULL,
  `thumb_url` varchar(500) DEFAULT NULL,
  `source_page` varchar(100) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `status` varchar(12) NOT NULL DEFAULT 'draft',
  `likes` int(11) NOT NULL DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx-sunnah-card-slug` (`slug`),
  KEY `idx-sunnah-card-category` (`category_id`, `sort_order`),
  KEY `idx-sunnah-card-status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bt_sunnah_card_reference` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `card_id` int(11) NOT NULL,
  `book_id` int(11) NOT NULL,
  `number` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx-sunnah-ref-card` (`card_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bt_sunnah_like` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `card_id` int(11) NOT NULL,
  `device_id` varchar(64) NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx-sunnah-like-card-device` (`card_id`, `device_id`),
  KEY `idx-sunnah-like-ip-time` (`ip`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Record the migration so `yii migrate` does not try to create the tables again.
INSERT IGNORE INTO `bt_migration` (`version`, `apply_time`) VALUES ('m261112_100000_nf015_sunnah_shorts', UNIX_TIMESTAMP());
