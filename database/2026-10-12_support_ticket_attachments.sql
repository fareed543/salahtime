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
