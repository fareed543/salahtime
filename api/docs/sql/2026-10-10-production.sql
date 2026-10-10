-- Production DB changes for 2026-10-10 (run in phpMyAdmin on the PRODUCTION database).
-- Same effect as `php yii migrate` for:
--   m261010_100000_create_support_ticket_table      (Support Desk / "Report an Issue")
--   m261010_120000_update_email_template_logo_header (logo header in email template #1)
-- Safe to run more than once. Take a backup of bt_email_templates first (Export > table) to be able to undo step 2.
-- "General Settings" (Login & OTP Channels) needs NO database change: it is saved to api/data/app-settings.json.

-- 0) Optional: see which migrations production already has (compare with api/migrations/).
SELECT version, FROM_UNIXTIME(apply_time) AS applied_at FROM bt_migration ORDER BY apply_time DESC LIMIT 10;

-- 1) Support Desk tickets table.
CREATE TABLE IF NOT EXISTS `bt_support_ticket` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reference` varchar(20) DEFAULT NULL,
  `category` varchar(40) NOT NULL,
  `message` text NOT NULL,
  `name` varchar(120) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `page_url` varchar(500) DEFAULT NULL,
  `platform` varchar(20) DEFAULT NULL,
  `app_version` varchar(30) DEFAULT NULL,
  `language` varchar(10) DEFAULT NULL,
  `location` varchar(190) DEFAULT NULL,
  `context` text DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'new',
  `admin_note` text DEFAULT NULL,
  `handled_by` int(11) DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx-support-ticket-reference` (`reference`),
  KEY `idx-support-ticket-status` (`status`,`created_at`),
  KEY `idx-support-ticket-category` (`category`),
  KEY `idx-support-ticket-ip` (`ip_address`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2) Email template #1: replace the plain "Salah Time" heading with the logo + name + tagline header.
--    Replaces only the old heading link; does nothing if it was already replaced or edited.
UPDATE bt_email_templates
SET email_template = REPLACE(
  email_template,
  '<a href="index.html" style="color:#000;font-size:40px;font-weight:700;font-family:helvetica,arial,sans-serif;text-decoration:none">Salah Time</a>',
  '<!-- salahtime-email-header --><table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:2px solid #1a5249;border-radius:14px;border-collapse:separate"><tr><td valign="middle" style="padding:14px 12px 14px 18px"><a href="https://salah-times.in" style="text-decoration:none"><img src="https://api.salah-times.in/images/email/salahtime-logo.png" width="64" height="64" alt="SalahTime" style="display:block;width:64px;height:64px;border:0;outline:none;border-radius:50%"></a></td><td valign="middle" align="left" style="padding:14px 24px 14px 6px;font-family:helvetica,arial,sans-serif"><a href="https://salah-times.in" style="color:#1a5249;font-size:28px;line-height:32px;font-weight:700;letter-spacing:0.3px;text-decoration:none">SalahTime</a><div style="height:2px;line-height:2px;font-size:1px;background-color:#8fd3c0;margin:6px 0">&nbsp;</div><div style="color:#4f6b65;font-size:14px;line-height:18px">Your Salah companion</div></td></tr></table><!-- /salahtime-email-header -->'
)
WHERE id_email_template = 1;

-- Check step 2: has_logo_header must be 1. If it is 0, the production template differs from the
-- expected one; then run `php yii migrate` on the server instead (it matches the heading loosely).
SELECT id_email_template, LOCATE('salahtime-email-header', email_template) > 0 AS has_logo_header
FROM bt_email_templates WHERE id_email_template = 1;

-- 3) Record both as applied so a later `php yii migrate` does not try them again.
INSERT IGNORE INTO bt_migration (version, apply_time) VALUES
  ('m261010_100000_create_support_ticket_table', UNIX_TIMESTAMP()),
  ('m261010_120000_update_email_template_logo_header', UNIX_TIMESTAMP());
