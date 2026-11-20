-- ---------------------------------------------------------------------------------------------
-- CR-029: US & Canada cities — 81 US + 68 Canadian cities, and "Saint Louis" moved
-- from Michigan to St. Louis, Missouri (same slug). Source: GeoNames cities500 (CC BY 4.0), geoname_id kept;
-- Scarborough and North York (former Toronto cities) by hand, no geoname_id.
-- Retired US place names stay in the table (app picker, saved locations, masjids); only their web page redirects.
-- Safe to run more than once (skips cities that already exist).
-- ---------------------------------------------------------------------------------------------

UPDATE `bt_cities` ci JOIN `bt_countries` co ON co.id = ci.country_id
SET ci.latitude = 38.6272700, ci.longitude = -90.1978900, ci.timezone = 'America/Chicago', ci.population = 279695,
    ci.geoname_id = 4407066
WHERE co.slug = 'united-states' AND ci.slug = 'saint-louis';

INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4990510, co.id, 'Dearborn', 'Dearborn', 'dearborn', 42.3222600, -83.1763100, 'America/Detroit', 95171, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'dearborn') OR ci.geoname_id = 4990510);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4995197, co.id, 'Hamtramck', 'Hamtramck', 'hamtramck', 42.3928200, -83.0496400, 'America/Detroit', 22002, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'hamtramck') OR ci.geoname_id = 4995197);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5102466, co.id, 'Paterson', 'Paterson', 'paterson', 40.9167700, -74.1718100, 'America/New_York', 147754, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'paterson') OR ci.geoname_id = 5102466);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5099836, co.id, 'Jersey City', 'Jersey City', 'jersey-city', 40.7281600, -74.0776400, 'America/New_York', 264290, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'jersey-city') OR ci.geoname_id = 5099836);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5101798, co.id, 'Newark', 'Newark', 'newark', 40.7356600, -74.1723700, 'America/New_York', 281944, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'newark') OR ci.geoname_id = 5101798);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5323810, co.id, 'Anaheim', 'Anaheim', 'anaheim', 33.8352900, -117.9145000, 'America/Los_Angeles', 350742, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'anaheim') OR ci.geoname_id = 5323810);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5359777, co.id, 'Irvine', 'Irvine', 'irvine', 33.6694600, -117.8231100, 'America/Los_Angeles', 256927, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'irvine') OR ci.geoname_id = 5359777);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5351515, co.id, 'Garden Grove', 'Garden Grove', 'garden-grove', 33.7739100, -117.9414500, 'America/Los_Angeles', 175393, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'garden-grove') OR ci.geoname_id = 5351515);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5392171, co.id, 'San Jose', 'San Jose', 'san-jose', 37.3393900, -121.8949600, 'America/Los_Angeles', 997368, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'san-jose') OR ci.geoname_id = 5392171);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4758023, co.id, 'Fairfax', 'Fairfax', 'fairfax', 38.8462200, -77.3063700, 'America/New_York', 24013, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'fairfax') OR ci.geoname_id = 4758023);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4758390, co.id, 'Falls Church', 'Falls Church', 'falls-church', 38.8823300, -77.1710900, 'America/New_York', 13892, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'falls-church') OR ci.geoname_id = 4758390);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4763793, co.id, 'Herndon', 'Herndon', 'herndon', 38.9695500, -77.3861000, 'America/New_York', 24568, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'herndon') OR ci.geoname_id = 4763793);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4885573, co.id, 'Bridgeview', 'Bridgeview', 'bridgeview', 41.7500300, -87.8042200, 'America/Chicago', 16407, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'bridgeview') OR ci.geoname_id = 4885573);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4692559, co.id, 'Frisco', 'Frisco', 'frisco', 33.1506700, -96.8236100, 'America/Chicago', 154407, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'frisco') OR ci.geoname_id = 4692559);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4702732, co.id, 'Katy', 'Katy', 'katy', 29.7857900, -95.8244000, 'America/Chicago', 16158, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'katy') OR ci.geoname_id = 4702732);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4734825, co.id, 'Sugar Land', 'Sugar Land', 'sugar-land', 29.6196800, -95.6349500, 'America/Chicago', 88156, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sugar-land') OR ci.geoname_id = 4734825);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5150529, co.id, 'Cleveland', 'Cleveland', 'cleveland', 41.4995000, -81.6954100, 'America/New_York', 365379, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'cleveland') OR ci.geoname_id = 5150529);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4644585, co.id, 'Nashville', 'Nashville', 'nashville', 36.1658900, -86.7844400, 'America/Chicago', 689447, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'nashville') OR ci.geoname_id = 4644585);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5045360, co.id, 'Saint Paul', 'Saint Paul', 'saint-paul', 44.9444100, -93.0932700, 'America/Chicago', 303176, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'saint-paul') OR ci.geoname_id = 5045360);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5110302, co.id, 'Brooklyn', 'Brooklyn', 'brooklyn', 40.6501000, -73.9495800, 'America/New_York', 2736074, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'brooklyn') OR ci.geoname_id = 5110302);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5133273, co.id, 'Queens', 'Queens', 'queens', 40.6814900, -73.8365200, 'America/New_York', 2316841, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'queens') OR ci.geoname_id = 5133273);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5110266, co.id, 'The Bronx', 'The Bronx', 'the-bronx', 40.8498500, -73.8664100, 'America/New_York', 1385108, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'the-bronx') OR ci.geoname_id = 5110266);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5139568, co.id, 'Staten Island', 'Staten Island', 'staten-island', 40.5623300, -74.1398600, 'America/New_York', 468730, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'staten-island') OR ci.geoname_id = 5139568);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5096699, co.id, 'Clifton', 'Clifton', 'clifton', 40.8584300, -74.1637600, 'America/New_York', 86334, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'clifton') OR ci.geoname_id = 5096699);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4904937, co.id, 'Orland Park', 'Orland Park', 'orland-park', 41.6303100, -87.8539400, 'America/Chicago', 58619, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'orland-park') OR ci.geoname_id = 4904937);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4787534, co.id, 'Sterling', 'Sterling', 'sterling', 39.0062200, -77.4286000, 'America/New_York', 27822, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sterling') OR ci.geoname_id = 4787534);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4722625, co.id, 'Richardson', 'Richardson', 'richardson', 32.9481800, -96.7297200, 'America/Chicago', 110815, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'richardson') OR ci.geoname_id = 4722625);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4969398, co.id, 'Lewiston', 'Lewiston', 'lewiston', 44.1003500, -70.2147800, 'America/New_York', 36202, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'lewiston') OR ci.geoname_id = 4969398);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4736476, co.id, 'The Woodlands', 'The Woodlands', 'the-woodlands', 30.1579900, -95.4893800, 'America/Chicago', 93847, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'the-woodlands') OR ci.geoname_id = 4736476);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5784607, co.id, 'West Valley City', 'West Valley City', 'west-valley-city', 40.6916100, -112.0010500, 'America/Denver', 136208, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'west-valley-city') OR ci.geoname_id = 5784607);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4544349, co.id, 'Oklahoma City', 'Oklahoma City', 'oklahoma-city', 35.4675600, -97.5164300, 'America/Chicago', 681054, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'oklahoma-city') OR ci.geoname_id = 4544349);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5367929, co.id, 'Long Beach', 'Long Beach', 'long-beach', 33.7669600, -118.1892300, 'America/Los_Angeles', 474140, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'long-beach') OR ci.geoname_id = 5367929);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4791259, co.id, 'Virginia Beach', 'Virginia Beach', 'virginia-beach', 36.8529300, -75.9779900, 'America/New_York', 454808, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'virginia-beach') OR ci.geoname_id = 4791259);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4553433, co.id, 'Tulsa', 'Tulsa', 'tulsa', 36.1539800, -95.9927700, 'America/Chicago', 413066, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'tulsa') OR ci.geoname_id = 4553433);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5392900, co.id, 'Santa Ana', 'Santa Ana', 'santa-ana', 33.7455700, -117.8678300, 'America/Los_Angeles', 310227, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'santa-ana') OR ci.geoname_id = 5392900);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5336899, co.id, 'Chula Vista', 'Chula Vista', 'chula-vista', 32.6400500, -117.0842000, 'America/Los_Angeles', 265757, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'chula-vista') OR ci.geoname_id = 5336899);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5289282, co.id, 'Chandler', 'Chandler', 'chandler', 33.3061600, -111.8412500, 'America/Phoenix', 260828, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'chandler') OR ci.geoname_id = 5289282);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4464368, co.id, 'Durham', 'Durham', 'durham', 35.9940300, -78.8986200, 'America/New_York', 257636, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'durham') OR ci.geoname_id = 4464368);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5295903, co.id, 'Gilbert', 'Gilbert', 'gilbert', 33.3528300, -111.7890300, 'America/Phoenix', 247542, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'gilbert') OR ci.geoname_id = 5295903);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4499612, co.id, 'Winston-Salem', 'Winston-Salem', 'winston-salem', 36.0998600, -80.2442200, 'America/New_York', 241218, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'winston-salem') OR ci.geoname_id = 4499612);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5295985, co.id, 'Glendale', 'Glendale', 'glendale', 33.5386500, -112.1859900, 'America/Phoenix', 240126, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'glendale') OR ci.geoname_id = 5295985);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4158476, co.id, 'Hialeah', 'Hialeah', 'hialeah', 25.8576000, -80.2781100, 'America/New_York', 237069, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'hialeah') OR ci.geoname_id = 4158476);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4693003, co.id, 'Garland', 'Garland', 'garland', 32.9126200, -96.6388800, 'America/Chicago', 236897, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'garland') OR ci.geoname_id = 4693003);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5313457, co.id, 'Scottsdale', 'Scottsdale', 'scottsdale', 33.5092100, -111.8990300, 'America/Phoenix', 236839, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'scottsdale') OR ci.geoname_id = 5313457);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5350734, co.id, 'Fremont', 'Fremont', 'fremont', 37.5482700, -121.9885700, 'America/Los_Angeles', 232206, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'fremont') OR ci.geoname_id = 5350734);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5391710, co.id, 'San Bernardino', 'San Bernardino', 'san-bernardino', 34.1083400, -117.2897700, 'America/Los_Angeles', 216108, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'san-bernardino') OR ci.geoname_id = 5391710);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4068590, co.id, 'Huntsville', 'Huntsville', 'huntsville', 34.7304000, -86.5859400, 'America/Chicago', 215006, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'huntsville') OR ci.geoname_id = 4068590);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4853828, co.id, 'Des Moines', 'Des Moines', 'des-moines', 41.6005400, -93.6091100, 'America/Chicago', 214133, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'des-moines') OR ci.geoname_id = 4853828);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5349755, co.id, 'Fontana', 'Fontana', 'fontana', 34.0922300, -117.4350500, 'America/Los_Angeles', 212704, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'fontana') OR ci.geoname_id = 5349755);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4119403, co.id, 'Little Rock', 'Little Rock', 'little-rock', 34.7464800, -92.2895900, 'America/Chicago', 202591, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'little-rock') OR ci.geoname_id = 4119403);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4466033, co.id, 'Fayetteville', 'Fayetteville', 'fayetteville', 35.0526600, -78.8783600, 'America/New_York', 201963, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'fayetteville') OR ci.geoname_id = 4466033);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5358705, co.id, 'Huntington Beach', 'Huntington Beach', 'huntington-beach', 33.6603000, -117.9992300, 'America/Los_Angeles', 201899, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'huntington-beach') OR ci.geoname_id = 5358705);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5145215, co.id, 'Yonkers', 'Yonkers', 'yonkers', 40.9304000, -73.8978900, 'America/New_York', 201116, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'yonkers') OR ci.geoname_id = 5145215);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5516233, co.id, 'Amarillo', 'Amarillo', 'amarillo', 35.2220000, -101.8313000, 'America/Chicago', 198645, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'amarillo') OR ci.geoname_id = 5516233);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5145476, co.id, 'Akron', 'Akron', 'akron', 41.0814400, -81.5190100, 'America/New_York', 197542, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'akron') OR ci.geoname_id = 5145476);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4049979, co.id, 'Birmingham', 'Birmingham', 'birmingham', 33.5206600, -86.8024900, 'America/Chicago', 196357, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'birmingham') OR ci.geoname_id = 4049979);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4076784, co.id, 'Montgomery', 'Montgomery', 'montgomery', 32.3668100, -86.2999700, 'America/Chicago', 195287, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'montgomery') OR ci.geoname_id = 4076784);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5308480, co.id, 'Peoria', 'Peoria', 'peoria', 33.5806000, -112.2373800, 'America/Phoenix', 190985, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'peoria') OR ci.geoname_id = 5308480);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4634946, co.id, 'Knoxville', 'Knoxville', 'knoxville', 35.9606400, -83.9207400, 'America/New_York', 190740, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'knoxville') OR ci.geoname_id = 4634946);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4694482, co.id, 'Grand Prairie', 'Grand Prairie', 'grand-prairie', 32.7459600, -96.9977800, 'America/Chicago', 187809, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'grand-prairie') OR ci.geoname_id = 4694482);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4341513, co.id, 'Shreveport', 'Shreveport', 'shreveport', 32.5251500, -93.7501800, 'America/Chicago', 187593, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'shreveport') OR ci.geoname_id = 4341513);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4276873, co.id, 'Overland Park', 'Overland Park', 'overland-park', 38.9822300, -94.6707900, 'America/Chicago', 186515, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'overland-park') OR ci.geoname_id = 4276873);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4776024, co.id, 'Newport News', 'Newport News', 'newport-news', 36.9803800, -76.4297500, 'America/New_York', 186247, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'newport-news') OR ci.geoname_id = 4776024);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4076598, co.id, 'Mobile', 'Mobile', 'mobile', 30.6943600, -88.0430500, 'America/Chicago', 183289, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'mobile') OR ci.geoname_id = 4076598);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4612862, co.id, 'Chattanooga', 'Chattanooga', 'chattanooga', 35.0456300, -85.3096800, 'America/New_York', 181099, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'chattanooga') OR ci.geoname_id = 4612862);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5317058, co.id, 'Tempe', 'Tempe', 'tempe', 33.4147700, -111.9093100, 'America/Phoenix', 175826, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'tempe') OR ci.geoname_id = 5317058);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4315588, co.id, 'Baton Rouge', 'Baton Rouge', 'baton-rouge', 30.4433200, -91.1874700, 'America/Chicago', 227470, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'baton-rouge') OR ci.geoname_id = 4315588);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5814616, co.id, 'Vancouver', 'Vancouver', 'vancouver', 45.6387300, -122.6614900, 'America/Los_Angeles', 196442, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'vancouver') OR ci.geoname_id = 5814616);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5750162, co.id, 'Salem', 'Salem', 'salem', 44.9429000, -123.0351000, 'America/Los_Angeles', 175535, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'salem') OR ci.geoname_id = 5750162);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5385955, co.id, 'Rancho Cucamonga', 'Rancho Cucamonga', 'rancho-cucamonga', 34.1064000, -117.5931100, 'America/Los_Angeles', 175236, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'rancho-cucamonga') OR ci.geoname_id = 5385955);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5379439, co.id, 'Ontario', 'Ontario', 'ontario', 34.0633400, -117.6508900, 'America/Los_Angeles', 171214, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'ontario') OR ci.geoname_id = 5379439);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5346111, co.id, 'Elk Grove', 'Elk Grove', 'elk-grove', 38.4088000, -121.3716200, 'America/Los_Angeles', 166913, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'elk-grove') OR ci.geoname_id = 5346111);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4613868, co.id, 'Clarksville', 'Clarksville', 'clarksville', 36.5297700, -87.3594500, 'America/Chicago', 166722, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'clarksville') OR ci.geoname_id = 4613868);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4168139, co.id, 'Pembroke Pines', 'Pembroke Pines', 'pembroke-pines', 26.0031500, -80.2239400, 'America/New_York', 166611, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'pembroke-pines') OR ci.geoname_id = 4168139);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4644312, co.id, 'Murfreesboro', 'Murfreesboro', 'murfreesboro', 35.8456200, -86.3902700, 'America/Chicago', 165430, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'murfreesboro') OR ci.geoname_id = 4644312);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4710178, co.id, 'McKinney', 'McKinney', 'mckinney', 33.1976200, -96.6152700, 'America/Chicago', 162898, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'mckinney') OR ci.geoname_id = 4710178);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4744091, co.id, 'Alexandria', 'Alexandria', 'alexandria', 38.8048400, -77.0469200, 'America/New_York', 159467, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'alexandria') OR ci.geoname_id = 4744091);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5355933, co.id, 'Hayward', 'Hayward', 'hayward', 37.6688200, -122.0808000, 'America/Los_Angeles', 158289, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'hayward') OR ci.geoname_id = 5355933);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5400075, co.id, 'Sunnyvale', 'Sunnyvale', 'sunnyvale', 37.3688300, -122.0363500, 'America/Los_Angeles', 155805, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sunnyvale') OR ci.geoname_id = 5400075);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 4431410, co.id, 'Jackson', 'Jackson', 'jackson', 32.2987600, -90.1848100, 'America/Chicago', 153701, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'jackson') OR ci.geoname_id = 4431410);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5384170, co.id, 'Pomona', 'Pomona', 'pomona', 34.0552900, -117.7522800, 'America/Los_Angeles', 153266, 1
FROM `bt_countries` co WHERE co.slug = 'united-states'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'pomona') OR ci.geoname_id = 5384170);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5882873, co.id, 'Ajax', 'Ajax', 'ajax', 43.8501200, -79.0328800, 'America/Toronto', 119677, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'ajax') OR ci.geoname_id = 5882873);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6104111, co.id, 'Pickering', 'Pickering', 'pickering', 43.9001200, -79.1328900, 'America/Toronto', 91771, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'pickering') OR ci.geoname_id = 6104111);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6074377, co.id, 'Milton', 'Milton', 'milton', 43.5168100, -79.8829400, 'America/Toronto', 132979, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'milton') OR ci.geoname_id = 6074377);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6180170, co.id, 'Whitby', 'Whitby', 'whitby', 43.8834200, -78.9328700, 'America/Toronto', 138501, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'whitby') OR ci.geoname_id = 6180170);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5967629, co.id, 'Guelph', 'Guelph', 'guelph', 43.5459400, -80.2559900, 'America/Toronto', 143740, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'guelph') OR ci.geoname_id = 5967629);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6176823, co.id, 'Waterloo', 'Waterloo', 'waterloo', 43.4668000, -80.5163900, 'America/Toronto', 104986, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'waterloo') OR ci.geoname_id = 6176823);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5950268, co.id, 'Etobicoke', 'Etobicoke', 'etobicoke', 43.6441500, -79.5698500, 'America/Toronto', 365000, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'etobicoke') OR ci.geoname_id = 5950268);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5964700, co.id, 'Greater Sudbury', 'Greater Sudbury', 'greater-sudbury', 46.4900000, -80.9900100, 'America/Toronto', 166004, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'greater-sudbury') OR ci.geoname_id = 5964700);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6137270, co.id, 'Saguenay', 'Saguenay', 'saguenay', 48.4167500, -71.0657300, 'America/Toronto', 148886, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'saguenay') OR ci.geoname_id = 6137270);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5927690, co.id, 'Coquitlam', 'Coquitlam', 'coquitlam', 49.2846000, -122.7821700, 'America/Vancouver', 148625, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'coquitlam') OR ci.geoname_id = 5927690);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5894171, co.id, 'Barrie', 'Barrie', 'barrie', 44.4001100, -79.6663400, 'America/Toronto', 147829, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'barrie') OR ci.geoname_id = 5894171);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5990579, co.id, 'Kelowna', 'Kelowna', 'kelowna', 49.8830700, -119.4856800, 'America/Vancouver', 144576, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kelowna') OR ci.geoname_id = 5990579);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6169141, co.id, 'Trois-Rivières', 'Trois-Rivieres', 'trois-rivieres', 46.3451500, -72.5477000, 'America/Toronto', 144472, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'trois-rivieres') OR ci.geoname_id = 6169141);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5881791, co.id, 'Abbotsford', 'Abbotsford', 'abbotsford', 49.0579800, -122.2525700, 'America/Vancouver', 141397, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'abbotsford') OR ci.geoname_id = 5881791);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6155721, co.id, 'St. Catharines', 'St. Catharines', 'st-catharines', 43.1712600, -79.2426700, 'America/Toronto', 136803, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'st-catharines') OR ci.geoname_id = 6155721);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6049429, co.id, 'Langley', 'Langley', 'langley', 49.1010700, -122.6588300, 'America/Vancouver', 132603, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'langley') OR ci.geoname_id = 6049429);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5992500, co.id, 'Kingston', 'Kingston', 'kingston', 44.2297600, -76.4809800, 'America/Toronto', 132485, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kingston') OR ci.geoname_id = 5992500);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5913695, co.id, 'Cambridge', 'Cambridge', 'cambridge', 43.3601000, -80.3126900, 'America/Toronto', 129920, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'cambridge') OR ci.geoname_id = 5913695);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6146143, co.id, 'Sherbrooke', 'Sherbrooke', 'sherbrooke', 45.4000800, -71.8990800, 'America/Toronto', 129447, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sherbrooke') OR ci.geoname_id = 6146143);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6136944, co.id, 'Saanich', 'Saanich', 'saanich', 48.5496400, -123.3693100, 'America/Vancouver', 117735, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'saanich') OR ci.geoname_id = 6136944);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6163012, co.id, 'Terrebonne', 'Terrebonne', 'terrebonne', 45.7000400, -73.6473200, 'America/Toronto', 111575, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'terrebonne') OR ci.geoname_id = 6163012);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6324733, co.id, 'St. John''s', 'St. John''s', 'st-john-s', 47.5649400, -52.7093100, 'America/St_Johns', 110525, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'st-john-s') OR ci.geoname_id = 6324733);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6166142, co.id, 'Thunder Bay', 'Thunder Bay', 'thunder-bay', 48.3820200, -89.2501800, 'America/Toronto', 108843, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'thunder-bay') OR ci.geoname_id = 6166142);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5907990, co.id, 'Brantford', 'Brantford', 'brantford', 43.1334000, -80.2663600, 'America/Toronto', 104688, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'brantford') OR ci.geoname_id = 5907990);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5989045, co.id, 'Kamloops', 'Kamloops', 'kamloops', 50.6664800, -120.3192000, 'America/Vancouver', 104460, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'kamloops') OR ci.geoname_id = 5989045);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6053154, co.id, 'Lethbridge', 'Lethbridge', 'lethbridge', 49.6999900, -112.8185600, 'America/Edmonton', 103197, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'lethbridge') OR ci.geoname_id = 6053154);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5937615, co.id, 'Delta', 'Delta', 'delta', 49.0891700, -123.0532200, 'America/Vancouver', 101668, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'delta') OR ci.geoname_id = 5937615);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5921356, co.id, 'Chilliwack', 'Chilliwack', 'chilliwack', 49.1663800, -121.9525700, 'America/Vancouver', 101491, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'chilliwack') OR ci.geoname_id = 5921356);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6118158, co.id, 'Red Deer', 'Red Deer', 'red-deer', 52.2668200, -113.8020000, 'America/Edmonton', 100844, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'red-deer') OR ci.geoname_id = 6118158);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6087892, co.id, 'Niagara Falls', 'Niagara Falls', 'niagara-falls', 43.1001200, -79.0662700, 'America/Toronto', 99818, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'niagara-falls') OR ci.geoname_id = 6087892);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6138495, co.id, 'Saint-Jean-sur-Richelieu', 'Saint-Jean-sur-Richelieu', 'saint-jean-sur-richelieu', 45.3071300, -73.2625900, 'America/Toronto', 98036, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'saint-jean-sur-richelieu') OR ci.geoname_id = 6138495);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6087701, co.id, 'Newmarket', 'Newmarket', 'newmarket', 44.0501100, -79.4663100, 'America/Toronto', 91034, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'newmarket') OR ci.geoname_id = 6087701);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6085772, co.id, 'Nanaimo', 'Nanaimo', 'nanaimo', 49.1663800, -123.9400300, 'America/Vancouver', 90504, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'nanaimo') OR ci.geoname_id = 6085772);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5882799, co.id, 'Airdrie', 'Airdrie', 'airdrie', 51.3001100, -114.0352800, 'America/Edmonton', 90044, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'airdrie') OR ci.geoname_id = 5882799);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6090785, co.id, 'North Vancouver', 'North Vancouver', 'north-vancouver', 49.3163600, -123.0693400, 'America/Vancouver', 88168, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'north-vancouver') OR ci.geoname_id = 6090785);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6076211, co.id, 'Moncton', 'Moncton', 'moncton', 46.0945400, -64.7965000, 'America/Moncton', 86106, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'moncton') OR ci.geoname_id = 6076211);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6101645, co.id, 'Peterborough', 'Peterborough', 'peterborough', 44.3001200, -78.3162300, 'America/Toronto', 85807, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'peterborough') OR ci.geoname_id = 6101645);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6119518, co.id, 'Repentigny', 'Repentigny', 'repentigny', 45.7422200, -73.4500800, 'America/Toronto', 84965, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'repentigny') OR ci.geoname_id = 6119518);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6065686, co.id, 'Maple Ridge', 'Maple Ridge', 'maple-ridge', 49.2193900, -122.6019300, 'America/Vancouver', 82256, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'maple-ridge') OR ci.geoname_id = 6065686);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6113365, co.id, 'Prince George', 'Prince George', 'prince-george', 53.9166000, -122.7530100, 'America/Vancouver', 78943, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'prince-george') OR ci.geoname_id = 6113365);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6087844, co.id, 'New Westminster', 'New Westminster', 'new-westminster', 49.2067800, -122.9109200, 'America/Vancouver', 78916, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'new-westminster') OR ci.geoname_id = 6087844);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5913414, co.id, 'Caledon', 'Caledon', 'caledon', 43.8654400, -79.9932200, 'America/Toronto', 76581, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'caledon') OR ci.geoname_id = 5913414);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6141190, co.id, 'Sarnia', 'Sarnia', 'sarnia', 42.9786600, -82.4040700, 'America/Toronto', 72125, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sarnia') OR ci.geoname_id = 6141190);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6141439, co.id, 'Sault Ste. Marie', 'Sault Ste. Marie', 'sault-ste-marie', 46.5167700, -84.3332500, 'America/Toronto', 72051, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sault-ste-marie') OR ci.geoname_id = 6141439);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6138517, co.id, 'Saint John', 'Saint John', 'saint-john', 45.2707600, -66.0561600, 'America/Moncton', 71808, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'saint-john') OR ci.geoname_id = 6138517);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6146279, co.id, 'Sherwood Park', 'Sherwood Park', 'sherwood-park', 53.5168400, -113.3187000, 'America/Edmonton', 70618, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'sherwood-park') OR ci.geoname_id = 6146279);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5964347, co.id, 'Grande Prairie', 'Grande Prairie', 'grande-prairie', 55.1666700, -118.8027100, 'America/Edmonton', 70385, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'grande-prairie') OR ci.geoname_id = 5964347);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5909629, co.id, 'Brossard', 'Brossard', 'brossard', 45.4500800, -73.4658300, 'America/Toronto', 69575, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'brossard') OR ci.geoname_id = 5909629);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5955895, co.id, 'Fort McMurray', 'Fort McMurray', 'fort-mcmurray', 56.7267600, -111.3810300, 'America/Edmonton', 66573, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'fort-mcmurray') OR ci.geoname_id = 5955895);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5964215, co.id, 'Granby', 'Granby', 'granby', 45.4000800, -72.7324300, 'America/Toronto', 66222, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'granby') OR ci.geoname_id = 5964215);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6071618, co.id, 'Medicine Hat', 'Medicine Hat', 'medicine-hat', 50.0392800, -110.6766100, 'America/Edmonton', 63138, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'medicine-hat') OR ci.geoname_id = 6071618);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5957776, co.id, 'Fredericton', 'Fredericton', 'fredericton', 45.9454100, -66.6655800, 'America/Moncton', 63116, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'fredericton') OR ci.geoname_id = 5957776);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5969721, co.id, 'Halton Hills', 'Halton Hills', 'halton-hills', 43.6403000, -79.9314600, 'America/Toronto', 62951, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'halton-hills') OR ci.geoname_id = 5969721);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5942845, co.id, 'Drummondville', 'Drummondville', 'drummondville', 45.8833600, -72.4824100, 'America/Toronto', 59489, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'drummondville') OR ci.geoname_id = 5942845);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6111706, co.id, 'Port Coquitlam', 'Port Coquitlam', 'port-coquitlam', 49.2663700, -122.7693200, 'America/Vancouver', 58000, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'port-coquitlam') OR ci.geoname_id = 6111706);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6155033, co.id, 'St. Albert', 'St. Albert', 'st-albert', 53.6334400, -113.6353300, 'America/Edmonton', 57719, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'st-albert') OR ci.geoname_id = 6155033);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5888377, co.id, 'Aurora', 'Aurora', 'aurora', 44.0001100, -79.4663200, 'America/Toronto', 55445, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'aurora') OR ci.geoname_id = 5888377);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6138501, co.id, 'Saint-Jérôme', 'Saint-Jerome', 'saint-jerome', 45.7803600, -74.0036500, 'America/Toronto', 54948, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'saint-jerome') OR ci.geoname_id = 6138501);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6177869, co.id, 'Welland', 'Welland', 'welland', 42.9834200, -79.2495800, 'America/Toronto', 52293, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'welland') OR ci.geoname_id = 6177869);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6180176, co.id, 'Whitchurch-Stouffville', 'Whitchurch-Stouffville', 'whitchurch-stouffville', 44.0001200, -79.3163000, 'America/Toronto', 49864, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'whitchurch-stouffville') OR ci.geoname_id = 6180176);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5907896, co.id, 'Brandon', 'Brandon', 'brandon', 49.8469200, -99.9530600, 'America/Winnipeg', 48859, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'brandon') OR ci.geoname_id = 5907896);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5928065, co.id, 'Cornwall', 'Cornwall', 'cornwall', 45.0180900, -74.7281500, 'America/Toronto', 48821, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'cornwall') OR ci.geoname_id = 5928065);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5940956, co.id, 'Dollard-Des Ormeaux', 'Dollard-Des Ormeaux', 'dollard-des-ormeaux', 45.4945200, -73.8241900, 'America/Toronto', 48930, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'dollard-des-ormeaux') OR ci.geoname_id = 5940956);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 5897884, co.id, 'Belleville', 'Belleville', 'belleville', 44.1668200, -77.3827700, 'America/Toronto', 50716, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'belleville') OR ci.geoname_id = 5897884);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6089426, co.id, 'North Bay', 'North Bay', 'north-bay', 46.3168000, -79.4663300, 'America/Toronto', 50396, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'north-bay') OR ci.geoname_id = 6089426);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT 6138374, co.id, 'Saint-Hyacinthe', 'Saint-Hyacinthe', 'saint-hyacinthe', 45.6307600, -72.9569900, 'America/Toronto', 50326, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'saint-hyacinthe') OR ci.geoname_id = 6138374);
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT NULL, co.id, 'Scarborough', 'Scarborough', 'scarborough', 43.7731000, -79.2578000, 'America/Toronto', 629941, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'scarborough'));
INSERT INTO `bt_cities` (`geoname_id`, `country_id`, `name`, `ascii_name`, `slug`, `latitude`, `longitude`, `timezone`, `population`, `is_active`)
SELECT NULL, co.id, 'North York', 'North York', 'north-york', 43.7676000, -79.4146000, 'America/Toronto', 869401, 1
FROM `bt_countries` co WHERE co.slug = 'canada'
  AND NOT EXISTS (SELECT 1 FROM `bt_cities` ci WHERE (ci.country_id = co.id AND ci.slug = 'north-york'));
