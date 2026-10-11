-- Remove the states/provinces concept (run in phpMyAdmin on the PRODUCTION database).
-- Same effect as `php yii migrate` for m261011_100000_remove_states_from_locations.
-- IRREVERSIBLE: export bt_states and bt_cities first (Export > tables) if you might need them.
-- Written for MariaDB (Hostinger). Run it once.

-- 1) City slugs become unique per country. If the same slug exists in two former states,
--    keep the oldest and rename the others to "<slug>-<state-slug>" (e.g. aurangabad-bihar).
UPDATE bt_cities c
JOIN (
  SELECT country_id, slug, MIN(id) AS keep_id
  FROM bt_cities
  GROUP BY country_id, slug
  HAVING COUNT(*) > 1
) d ON d.country_id = c.country_id AND d.slug = c.slug AND c.id <> d.keep_id
LEFT JOIN bt_states s ON s.id = c.state_id
SET c.slug = CONCAT(c.slug, '-', COALESCE(s.slug, c.id));

-- 2) Remove the state link from cities.
ALTER TABLE bt_cities DROP FOREIGN KEY IF EXISTS fk_cities_state;
ALTER TABLE bt_cities DROP INDEX IF EXISTS idx_cities_country_state_slug;
ALTER TABLE bt_cities DROP INDEX IF EXISTS idx_cities_state;
ALTER TABLE bt_cities DROP COLUMN IF EXISTS state_id;
ALTER TABLE bt_cities ADD UNIQUE INDEX IF NOT EXISTS idx_cities_country_slug (country_id, slug);

-- 3) Festival observances no longer have a state level (only if that table exists).
SET @dropObservanceState := (
  SELECT IF(COUNT(*) > 0, 'ALTER TABLE bt_location_observance DROP COLUMN state_id', 'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bt_location_observance' AND COLUMN_NAME = 'state_id'
);
PREPARE dropObservanceState FROM @dropObservanceState;
EXECUTE dropObservanceState;
DEALLOCATE PREPARE dropObservanceState;

-- 4) Drop the states table.
DROP TABLE IF EXISTS bt_states;

-- 5) Record the migration so `php yii migrate` does not try it again.
INSERT IGNORE INTO bt_migration (version, apply_time) VALUES
  ('m261011_100000_remove_states_from_locations', UNIX_TIMESTAMP());

-- Check: should list no state_id column and show idx_cities_country_slug.
SHOW COLUMNS FROM bt_cities;
SHOW INDEX FROM bt_cities WHERE Key_name = 'idx_cities_country_slug';
