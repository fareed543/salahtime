-- ---------------------------------------------------------------------------------------------
-- NF-003 Blog: user-written articles, their versions, review history and daily unique views.
-- SQL equivalent of api/migrations/m261027_120000_create_blog_tables.php.
--
-- Cover images are stored in api/web/blog-covers/<article id>/ (public, like masjid-images).
-- Safe to run more than once.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `bt_blog_article` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `author_id` int(11) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `slug` varchar(190) DEFAULT NULL,
  `live_version_id` int(11) DEFAULT NULL,
  `latest_version_id` int(11) DEFAULT NULL,
  `proposal_version_id` int(11) DEFAULT NULL,
  `views` int(11) NOT NULL DEFAULT 0,
  `reject_reason` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx-blog-article-slug` (`slug`),
  KEY `idx-blog-article-author` (`author_id`),
  KEY `idx-blog-article-status` (`status`),
  KEY `idx-blog-article-public` (`is_public`, `published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bt_blog_article_version` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `article_id` int(11) NOT NULL,
  `version_no` int(11) NOT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'author',
  `title` varchar(190) NOT NULL,
  `slug` varchar(190) NOT NULL,
  `content_html` mediumtext NOT NULL,
  `meta_title` varchar(120) DEFAULT NULL,
  `meta_description` varchar(300) DEFAULT NULL,
  `focus_keyword` varchar(100) DEFAULT NULL,
  `category` varchar(40) DEFAULT NULL,
  `tags` varchar(300) DEFAULT NULL,
  `language` varchar(10) DEFAULT NULL,
  `cover_image_url` varchar(500) DEFAULT NULL,
  `cover_thumb_url` varchar(500) DEFAULT NULL,
  `cover_alt` varchar(190) DEFAULT NULL,
  `references_text` text DEFAULT NULL,
  `seo_score` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `word_count` int(11) NOT NULL DEFAULT 0,
  `note` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx-blog-version-article-no` (`article_id`, `version_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bt_blog_article_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `article_id` int(11) NOT NULL,
  `version_id` int(11) DEFAULT NULL,
  `action` varchar(30) NOT NULL,
  `from_status` varchar(20) DEFAULT NULL,
  `to_status` varchar(20) DEFAULT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `actor_role` varchar(10) NOT NULL DEFAULT 'author',
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx-blog-event-article` (`article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bt_blog_article_view` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `article_id` int(11) NOT NULL,
  `view_date` date NOT NULL,
  `visitor_hash` char(40) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx-blog-view-unique` (`article_id`, `view_date`, `visitor_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `bt_migration` (`version`, `apply_time`)
SELECT 'm261027_120000_create_blog_tables', UNIX_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `bt_migration` WHERE `version` = 'm261027_120000_create_blog_tables'
);

-- Rollback:
--   DROP TABLE `bt_blog_article_view`, `bt_blog_article_event`, `bt_blog_article_version`, `bt_blog_article`;
--   DELETE FROM `bt_migration` WHERE `version` = 'm261027_120000_create_blog_tables';
