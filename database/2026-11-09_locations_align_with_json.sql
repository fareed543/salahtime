-- 2026-11-09 — Align bt_cities with frontend/src/assets/locations.json (CR-008 + location cleanup)
--
-- Safe to run more than once; looks countries up by slug, so the same script works on local, dev and
-- production. Locations stay country -> city (no states: migration m261011_100000_remove_states_from_locations).
--
-- 1. Remove two state names that were listed as cities (India: "Manipur", "Arunachal Pradesh").
--    The website already redirects their URLs to Imphal / Itanagar (seo-content.ts CITY_URL_REDIRECTS).
--    On a database that has bt_location_observance, first check nothing points at them:
--      SELECT o.* FROM bt_location_observance o JOIN bt_cities ci ON ci.id = o.city_id
--      JOIN bt_countries co ON co.id = ci.country_id
--      WHERE co.slug = 'india' AND ci.slug IN ('manipur', 'arunachal-pradesh');
-- 2. Correct Mahabubabad (Telangana): was 17.8051, 80.5805 (about 60 km off), town centre 17.6004, 80.0054.
-- 3. Add the 35 Indian cities of CR-008 (coordinates from OpenStreetMap, checked against the AlAdhan API).
--
-- Afterwards: Back office -> Locations -> Release, only when the website keeps states on sync
-- (frontend/tools/sync-locations.js, 2026-11-09).

SET NAMES utf8mb4;
START TRANSACTION;

DELETE FROM bt_cities
WHERE country_id = (SELECT id FROM bt_countries WHERE slug = 'india')
  AND slug IN ('manipur', 'arunachal-pradesh');

UPDATE bt_cities
SET latitude = 17.6004, longitude = 80.0054
WHERE country_id = (SELECT id FROM bt_countries WHERE slug = 'india')
  AND slug = 'mahabubabad';

INSERT INTO bt_cities (country_id, name, ascii_name, slug, latitude, longitude, timezone, population, is_active)
SELECT co.id, v.name, v.name, v.slug, v.lat, v.lon, 'Asia/Kolkata', 0, 1
FROM (
            SELECT 'Ghaziabad' AS name, 'ghaziabad' AS slug, 28.6712 AS lat, 77.4120 AS lon
  UNION ALL SELECT 'Noida', 'noida', 28.5706, 77.3272
  UNION ALL SELECT 'Budaun', 'budaun', 28.0367, 79.1234
  UNION ALL SELECT 'Gurugram', 'gurugram', 28.4646, 77.0299
  UNION ALL SELECT 'Nuh', 'nuh', 28.0974, 77.0516
  UNION ALL SELECT 'Malerkotla', 'malerkotla', 30.5331, 75.8808
  UNION ALL SELECT 'Mohali', 'mohali', 30.6909, 76.7115
  UNION ALL SELECT 'Thane', 'thane', 19.1943, 72.9702
  UNION ALL SELECT 'Mumbra', 'mumbra', 19.1899, 73.0231
  UNION ALL SELECT 'Bhiwandi', 'bhiwandi', 19.3026, 73.0588
  UNION ALL SELECT 'Navi Mumbai', 'navi-mumbai', 19.0308, 73.0199
  UNION ALL SELECT 'Mira-Bhayandar', 'mira-bhayandar', 19.2817, 72.8561
  UNION ALL SELECT 'Vasai-Virar', 'vasai-virar', 19.4498, 72.8121
  UNION ALL SELECT 'Ulhasnagar', 'ulhasnagar', 19.2236, 73.1672
  UNION ALL SELECT 'Amravati', 'amravati', 20.9316, 77.7588
  UNION ALL SELECT 'Murshidabad', 'murshidabad', 24.1746, 88.2721
  UNION ALL SELECT 'Baharampur', 'baharampur', 24.1045, 88.2511
  UNION ALL SELECT 'Nellore', 'nellore', 14.4494, 79.9874
  UNION ALL SELECT 'Kadapa', 'kadapa', 14.4753, 78.8217
  UNION ALL SELECT 'Secunderabad', 'secunderabad', 17.4337, 78.5007
  UNION ALL SELECT 'Hubballi', 'hubballi', 15.3518, 75.1380
  UNION ALL SELECT 'Dharwad', 'dharwad', 15.4541, 75.0067
  UNION ALL SELECT 'Davanagere', 'davanagere', 14.4661, 75.9206
  UNION ALL SELECT 'Kayalpattinam', 'kayalpattinam', 8.5678, 78.1004
  UNION ALL SELECT 'Nagore', 'nagore', 10.8167, 79.8404
  UNION ALL SELECT 'Kilakarai', 'kilakarai', 9.2307, 78.7843
  UNION ALL SELECT 'Melvisharam', 'melvisharam', 12.9175, 79.2781
  UNION ALL SELECT 'Thoothukudi', 'thoothukudi', 8.8053, 78.1453
  UNION ALL SELECT 'Tirur', 'tirur', 10.9167, 75.9240
  UNION ALL SELECT 'Manjeri', 'manjeri', 11.1202, 76.1198
  UNION ALL SELECT 'Perinthalmanna', 'perinthalmanna', 10.9757, 76.2263
  UNION ALL SELECT 'Kondotty', 'kondotty', 11.1457, 75.9644
  UNION ALL SELECT 'Baramulla', 'baramulla', 34.2087, 74.3435
  UNION ALL SELECT 'Sopore', 'sopore', 34.2869, 74.4626
  UNION ALL SELECT 'Madgaon', 'madgaon', 15.2729, 73.9583
) v
JOIN bt_countries co ON co.slug = 'india'
WHERE NOT EXISTS (SELECT 1 FROM bt_cities x WHERE x.country_id = co.id AND x.slug = v.slug);

COMMIT;
