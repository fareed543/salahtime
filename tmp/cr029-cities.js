// CR-029 generator (not shipped): adds US / Canada cities from GeoNames, fixes Saint Louis, lists weak US places
// to redirect, and writes the SQL. Usage: node tmp/cr029-cities.js <geonames dir with cities500.txt + admin1CodesASCII.txt>
const fs = require('fs');
const path = require('path');
const gdir = process.argv[2];
const root = path.resolve(__dirname, '..');
const locFile = path.join(root, 'frontend/src/assets/locations.json');

const a1 = {};
fs.readFileSync(path.join(gdir, 'admin1CodesASCII.txt'), 'utf8').split('\n').forEach(l => { const p = l.split('\t'); if (p[0]) a1[p[0]] = p[1]; });
const G = fs.readFileSync(path.join(gdir, 'cities500.txt'), 'utf8').split('\n').filter(Boolean).map(l => {
  const p = l.split('\t');
  return { id: +p[0], name: p[1], ascii: p[2], lat: +p[4], lon: +p[5], fc: p[7], cc: p[8], st: a1[p[8] + '.' + p[10]] || '', pop: +p[14], tz: p[17] };
});
const byId = Object.fromEntries(G.map(g => [g.id, g]));
const slug = v => v.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const dist = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return 6371 * Math.hypot(x, y); };
const pick = (cc, name, state) => {
  const m = G.filter(g => g.cc === cc && g.name === name && (!state || g.st === state)).sort((a, b) => b.pop - a.pop);
  if (!m.length) throw new Error(`not found: ${cc} ${name} ${state || ''}`);
  return m[0];
};

// ---- lists (design §4) ----
const US_ADD = [
  // requested
  ['Dearborn', 'Michigan'], ['Hamtramck', 'Michigan'], ['Paterson', 'New Jersey'], ['Jersey City', 'New Jersey'], ['Newark', 'New Jersey'],
  ['Anaheim', 'California'], ['Irvine', 'California'], ['Garden Grove', 'California'], ['San Jose', 'California'], ['Fairfax', 'Virginia'],
  ['Falls Church', 'Virginia'], ['Herndon', 'Virginia'], ['Bridgeview', 'Illinois'], ['Frisco', 'Texas'], ['Katy', 'Texas'],
  ['Sugar Land', 'Texas'], ['Cleveland', 'Ohio'], ['Nashville', 'Tennessee'], ['Saint Paul', 'Minnesota'],
  // NYC boroughs (Manhattan = New York City)
  ['Brooklyn', 'New York'], ['Queens', 'New York'], ['The Bronx', 'New York'], ['Staten Island', 'New York'],
  // other Muslim-community places
  ['Clifton', 'New Jersey'], ['Orland Park', 'Illinois'], ['Sterling', 'Virginia'], ['Richardson', 'Texas'], ['Lewiston', 'Maine'],
  // replacements for wrong entries
  ['The Woodlands', 'Texas'], ['West Valley City', 'Utah'],
  // every real city >= 150k that was missing (neighbourhood rows and names already used in the US left out)
  ['Oklahoma City', 'Oklahoma'], ['Long Beach', 'California'], ['Virginia Beach', 'Virginia'], ['Tulsa', 'Oklahoma'],
  ['Santa Ana', 'California'], ['Chula Vista', 'California'], ['Chandler', 'Arizona'], ['Durham', 'North Carolina'],
  ['Gilbert', 'Arizona'], ['Winston-Salem', 'North Carolina'], ['Glendale', 'Arizona'], ['Hialeah', 'Florida'], ['Garland', 'Texas'],
  ['Scottsdale', 'Arizona'], ['Fremont', 'California'], ['San Bernardino', 'California'], ['Huntsville', 'Alabama'],
  ['Des Moines', 'Iowa'], ['Fontana', 'California'], ['Little Rock', 'Arkansas'], ['Fayetteville', 'North Carolina'],
  ['Huntington Beach', 'California'], ['Yonkers', 'New York'], ['Amarillo', 'Texas'], ['Akron', 'Ohio'], ['Birmingham', 'Alabama'],
  ['Montgomery', 'Alabama'], ['Peoria', 'Arizona'], ['Knoxville', 'Tennessee'], ['Grand Prairie', 'Texas'], ['Shreveport', 'Louisiana'],
  ['Overland Park', 'Kansas'], ['Newport News', 'Virginia'], ['Mobile', 'Alabama'], ['Chattanooga', 'Tennessee'], ['Tempe', 'Arizona'],
  ['Baton Rouge', 'Louisiana'], ['Vancouver', 'Washington'], // were hidden behind Zee Zee Gardens / Hazel Dell
  ['Salem', 'Oregon'], ['Rancho Cucamonga', 'California'], ['Ontario', 'California'], ['Elk Grove', 'California'],
  ['Clarksville', 'Tennessee'], ['Pembroke Pines', 'Florida'], ['Murfreesboro', 'Tennessee'], ['McKinney', 'Texas'],
  ['Alexandria', 'Virginia'], ['Hayward', 'California'], ['Sunnyvale', 'California'], ['Jackson', 'Mississippi'], ['Pomona', 'California'],
];
const CA_ADD = [
  ['Ajax', 'Ontario'], ['Pickering', 'Ontario'], ['Milton', 'Ontario'], ['Whitby', 'Ontario'], ['Guelph', 'Ontario'], ['Waterloo', 'Ontario'],
  ['Etobicoke', 'Ontario'],
  ['Greater Sudbury', 'Ontario'], ['Saguenay', 'Quebec'], ['Coquitlam', 'British Columbia'], ['Barrie', 'Ontario'],
  ['Kelowna', 'British Columbia'], ['Trois-Rivières', 'Quebec'], ['Abbotsford', 'British Columbia'], ['St. Catharines', 'Ontario'],
  ['Langley', 'British Columbia'], ['Kingston', 'Ontario'], ['Cambridge', 'Ontario'], ['Sherbrooke', 'Quebec'], ['Saanich', 'British Columbia'],
  ['Terrebonne', 'Quebec'], ["St. John's", 'Newfoundland and Labrador'], ['Thunder Bay', 'Ontario'], ['Brantford', 'Ontario'],
  ['Kamloops', 'British Columbia'], ['Lethbridge', 'Alberta'], ['Delta', 'British Columbia'], ['Chilliwack', 'British Columbia'],
  ['Red Deer', 'Alberta'], ['Niagara Falls', 'Ontario'], ['Saint-Jean-sur-Richelieu', 'Quebec'], ['Newmarket', 'Ontario'],
  ['Nanaimo', 'British Columbia'], ['Airdrie', 'Alberta'], ['North Vancouver', 'British Columbia'], ['Moncton', 'New Brunswick'],
  ['Peterborough', 'Ontario'], ['Repentigny', 'Quebec'], ['Maple Ridge', 'British Columbia'], ['Prince George', 'British Columbia'],
  ['New Westminster', 'British Columbia'], ['Caledon', 'Ontario'], ['Sarnia', 'Ontario'], ['Sault Ste. Marie', 'Ontario'],
  ['Saint John', 'New Brunswick'], ['Sherwood Park', 'Alberta'], ['Grande Prairie', 'Alberta'], ['Brossard', 'Quebec'],
  ['Fort McMurray', 'Alberta'], ['Granby', 'Quebec'], ['Medicine Hat', 'Alberta'], ['Fredericton', 'New Brunswick'],
  ['Halton Hills', 'Ontario'], ['Drummondville', 'Quebec'], ['Port Coquitlam', 'British Columbia'], ['St. Albert', 'Alberta'],
  ['Aurora', 'Ontario'], ['Saint-Jérôme', 'Quebec'], ['Welland', 'Ontario'], ['Whitchurch-Stouffville', 'Ontario'],
  ['Brandon', 'Manitoba'], ['Cornwall', 'Ontario'], ['Dollard-Des Ormeaux', 'Quebec'], ['Belleville', 'Ontario'],
  ['North Bay', 'Ontario'], ['Saint-Hyacinthe', 'Quebec'],
];
// Former cities of Toronto that GeoNames has no populated-place row for: coordinates of their civic centres.
const MANUAL = [
  { city: 'Scarborough', state: 'Ontario', country: 'Canada', lat: 43.7731, lon: -79.2578, tz: 'America/Toronto', pop: 629941 },
  { city: 'North York', state: 'Ontario', country: 'Canada', lat: 43.7676, lon: -79.4146, tz: 'America/Toronto', pop: 869401 },
];
const KEEP_SMALL = ['Clarkston', 'Dearborn Heights', 'Daytona', 'Bensalem Township', 'Lakewood Township']; // Muslim-community places kept despite the size rule; real cities > 30k whose name differs from GeoNames
const RETIRE_MIN_POP = 30000;

// ---- build ----
const L = JSON.parse(fs.readFileSync(locFile, 'utf8'));
const report = [];
const added = [];
const sqlRows = [];
const entry = (city, state, country, lat, lon, tz) => ({ city, state, country, coordinates: { latitude: +lat.toFixed(4), longitude: +lon.toFixed(4) }, timezone: tz });

for (const [cc, country, list] of [['US', 'United States', US_ADD], ['CA', 'Canada', CA_ADD]]) {
  const taken = new Set(L.filter(x => x.country === country).map(x => slug(x.city)));
  for (const [name, state] of list) {
    const g = pick(cc, name, state);
    if (taken.has(slug(g.name))) { report.push(`SKIP (name already used in ${country}): ${g.name}, ${state}`); continue; }
    taken.add(slug(g.name));
    added.push(entry(g.name, state, country, g.lat, g.lon, g.tz));
    sqlRows.push({ id: g.id, country: slug(country), name: g.name, ascii: g.ascii, lat: g.lat, lon: g.lon, tz: g.tz, pop: g.pop });
  }
}
for (const m of MANUAL) {
  added.push(entry(m.city, m.state, m.country, m.lat, m.lon, m.tz));
  sqlRows.push({ id: null, country: slug(m.country), name: m.city, ascii: m.city, lat: m.lat, lon: m.lon, tz: m.tz, pop: m.pop });
}

// Saint Louis, Michigan -> St. Louis, Missouri (same URL)
const stl = L.find(x => x.country === 'United States' && x.city === 'Saint Louis');
const stlG = pick('US', 'St. Louis', 'Missouri');
Object.assign(stl, entry('Saint Louis', 'Missouri', 'United States', stlG.lat, stlG.lon, stlG.tz));
report.push(`FIX Saint Louis -> Missouri ${stlG.lat},${stlG.lon} (geoname ${stlG.id})`);

// Insert new rows after the last row of their country
for (const country of ['United States', 'Canada']) {
  const last = L.map(x => x.country).lastIndexOf(country);
  L.splice(last + 1, 0, ...added.filter(a => a.country === country));
}

// Weak US places: not a city in GeoNames (no same-name populated place within 8 km) or under 30,000 people
const usG = G.filter(g => g.cc === 'US');
const norm = v => slug(v).replace(/^(saint|st)-/, 'st-');
const retired = [];
for (const o of L.filter(x => x.country === 'United States')) {
  if (KEEP_SMALL.includes(o.city) || added.includes(o) || o === stl) continue;
  const near = usG.filter(g => norm(g.name) === norm(o.city) && dist(o.coordinates.latitude, o.coordinates.longitude, g.lat, g.lon) < 8)
    .sort((a, b) => b.pop - a.pop)[0];
  if (!near || near.pop < RETIRE_MIN_POP) retired.push({ o, pop: near ? near.pop : null });
}
const retiredSet = new Set(retired.map(r => r.o));
const kept = L.filter(x => x.country === 'United States' && !retiredSet.has(x));
const redirects = retired.map(({ o, pop }) => {
  let best = null, bd = 1e9;
  for (const k of kept) { const d = dist(o.coordinates.latitude, o.coordinates.longitude, k.coordinates.latitude, k.coordinates.longitude); if (d < bd) { bd = d; best = k; } }
  report.push(`RETIRE ${o.city}, ${o.state} (pop ${pop ?? 'not a city'}) -> ${best.city}, ${best.state} ${bd.toFixed(0)} km`);
  return [`united-states/${slug(o.city)}`, `united-states/${slug(best.city)}`];
});

fs.writeFileSync(locFile, JSON.stringify(L, null, 2) + '\n', 'utf8');

// TS snippet for CITY_URL_REDIRECTS
const ts = redirects.map(([a, b]) => `  '${a}': '${b}',`).join('\n');
fs.writeFileSync(path.join(__dirname, 'cr029-redirects.ts.txt'), ts + '\n', 'utf8');

// SQL
const q = v => `'${String(v).replace(/'/g, "''")}'`;
let sql = `-- ---------------------------------------------------------------------------------------------
-- CR-029: US & Canada cities — ${sqlRows.filter(r => r.country === 'united-states').length} US + ${sqlRows.filter(r => r.country === 'canada').length} Canadian cities, and "Saint Louis" moved
-- from Michigan to St. Louis, Missouri (same slug). Source: GeoNames cities500 (CC BY 4.0), geoname_id kept;
-- Scarborough and North York (former Toronto cities) by hand, no geoname_id.
-- Retired US place names stay in the table (app picker, saved locations, masjids); only their web page redirects.
-- Safe to run more than once (skips cities that already exist).
-- ---------------------------------------------------------------------------------------------\n\n`;
sql += `UPDATE \`bt_cities\` ci JOIN \`bt_countries\` co ON co.id = ci.country_id
SET ci.latitude = ${stlG.lat.toFixed(7)}, ci.longitude = ${stlG.lon.toFixed(7)}, ci.timezone = ${q(stlG.tz)}, ci.population = ${stlG.pop},
    ci.geoname_id = ${stlG.id}
WHERE co.slug = 'united-states' AND ci.slug = 'saint-louis';\n\n`;
for (const r of sqlRows) {
  const s = slug(r.name);
  const dup = r.id ? ` OR ci.geoname_id = ${r.id}` : '';
  sql += `INSERT INTO \`bt_cities\` (\`geoname_id\`, \`country_id\`, \`name\`, \`ascii_name\`, \`slug\`, \`latitude\`, \`longitude\`, \`timezone\`, \`population\`, \`is_active\`)
SELECT ${r.id ?? 'NULL'}, co.id, ${q(r.name)}, ${q(r.ascii)}, ${q(s)}, ${r.lat.toFixed(7)}, ${r.lon.toFixed(7)}, ${q(r.tz)}, ${r.pop}, 1
FROM \`bt_countries\` co WHERE co.slug = ${q(r.country)}
  AND NOT EXISTS (SELECT 1 FROM \`bt_cities\` ci WHERE (ci.country_id = co.id AND ci.slug = ${q(s)})${dup});\n`;
}
fs.writeFileSync(path.join(root, 'database/2026-11-20_cr029_us_canada_cities.sql'), sql, 'utf8');

console.log(report.join('\n'));
console.log(`\nadded ${added.length} (US ${added.filter(a => a.country === 'United States').length}, CA ${added.filter(a => a.country === 'Canada').length}); retired ${retired.length}; total ${L.length}`);
