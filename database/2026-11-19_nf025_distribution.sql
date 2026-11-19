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
