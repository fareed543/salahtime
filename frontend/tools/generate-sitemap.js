const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const locations = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/locations.json'), 'utf8'));
const siteUrl = 'https://salah-times.in';
const today = new Date().toISOString().slice(0, 10);

const slugify = (value) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

// lastmod is the date the page's source last changed in git, so search engines can trust it.
const lastModified = (sources) => {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...sources], { cwd: root, encoding: 'utf8' }).trim();
    return date || today;
  } catch {
    return today;
  }
};

const prayerTimesSources = [
  'src/app/components/salahtime',
  'src/app/components/all-prayer-times',
  'src/app/services/city-prayer-seo.service.ts',
  'src/app/shared/city-prayer-seo'
];

const staticPages = [
  ['/', 'daily', '1.0', ['src/app/components/dashboard']],
  ['/prayer-times', 'daily', '0.9', prayerTimesSources],
  ['/about', 'monthly', '0.8', ['src/app/components/about']],
  ['/privacy-policy', 'monthly', '0.6', ['src/app/components/privacy-policy']],
  ['/sehri-iftar', 'weekly', '0.7', ['src/app/components/ramzan']],
  ['/zikar', 'monthly', '0.7', ['src/app/components/tasbih']],
  ['/learn', 'monthly', '0.7', ['src/app/components/learn', 'src/assets/data/learn.json']],
  ['/duas', 'monthly', '0.7', ['src/app/components/duas', 'src/assets/data/duas.json']],
  ['/qibla-direction', 'monthly', '0.7', ['src/app/components/qibla-direction']],
  ['/salah-calendar', 'monthly', '0.7', ['src/app/shared/calender']],
  ['/zakat-calculator', 'monthly', '0.7', ['src/app/components/community/zakat-calculator']],
  ['/masjid', 'daily', '0.7', ['src/app/components/community/masjid']]
];

const urlEntry = (url, lastmod, changefreq, priority) =>
  `  <url>\n    <loc>${siteUrl}${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const urlset = (entries) => [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries,
  '</urlset>',
  ''
].join('\n');

const pageEntries = staticPages.map(([url, changefreq, priority, sources]) =>
  urlEntry(url, lastModified(sources), changefreq, priority));

const citiesLastmod = lastModified([...prayerTimesSources, 'src/assets/locations.json']);
// Country pages (/prayer-times/india ...) list every city in that country.
const countryEntries = [...new Set(locations.map(location => location.country).filter(Boolean).map(slugify))]
  .sort()
  .map(slug => urlEntry(`/prayer-times/${slug}`, citiesLastmod, 'weekly', '0.8'));

const cityEntries = [...new Set(locations.map(location => [location.country, location.city].filter(Boolean).map(slugify).join('/')))]
  .sort()
  .map(slug => urlEntry(`/prayer-times/${slug}`, citiesLastmod, 'daily', '0.9'));

// ---------------------------------------------------------------- masjid pages
// Masjids live in the database, so the public (approved) list is fetched from the production API.
// The response is cached for tools/prerender-seo.js; when the API can't be reached the last cached
// copy is reused, so a build never fails or drops masjid pages because of the network.
const masjidCacheFile = path.join(root, 'tools/.cache/masjids.json');
const masjidApiUrl = process.env.MASJID_API_URL
  || (fs.readFileSync(path.join(root, 'src/environments/environment.prod.ts'), 'utf8').match(/apiUrl:\s*'([^']+)'/) || [])[1];

const loadMasjids = async () => {
  try {
    const response = await fetch(`${masjidApiUrl}http-ramadan/masjid-list`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const list = await response.json();
    if (!Array.isArray(list)) throw new Error('unexpected response');
    // Only approved masjids with a public address (the API leaves pending ones out without a login).
    const masjids = list.filter(masjid => Number(masjid.status) === 1 && masjid.publicPath);
    fs.mkdirSync(path.dirname(masjidCacheFile), { recursive: true });
    fs.writeFileSync(masjidCacheFile, JSON.stringify(masjids, null, 2), 'utf8');
    return masjids;
  } catch (error) {
    if (fs.existsSync(masjidCacheFile)) {
      console.warn(`Masjid list unavailable from ${masjidApiUrl} (${error.message}); using the cached copy.`);
      return JSON.parse(fs.readFileSync(masjidCacheFile, 'utf8'));
    }
    console.warn(`Masjid list unavailable from ${masjidApiUrl} (${error.message}) and no cached copy; no masjid pages this build.`);
    fs.mkdirSync(path.dirname(masjidCacheFile), { recursive: true });
    fs.writeFileSync(masjidCacheFile, '[]', 'utf8');
    return [];
  }
};

const main = async () => {
  const masjids = await loadMasjids();
  const masjidLastmod = (masjid) => String(masjid.updatedAt || '').slice(0, 10) || today;
  const masjidEntries = masjids
    .slice()
    .sort((a, b) => a.publicPath.localeCompare(b.publicPath))
    .map(masjid => urlEntry(masjid.publicPath, masjidLastmod(masjid), 'weekly', '0.7'));

  const sitemaps = [
    ['sitemap-pages.xml', pageEntries, lastModified(staticPages.flatMap(page => page[3]))],
    ['sitemap-cities.xml', [...countryEntries, ...cityEntries], citiesLastmod],
    ['sitemap-masjids.xml', masjidEntries, masjids.map(masjidLastmod).sort().pop() || today]
  ];

  for (const [file, entries] of sitemaps) {
    fs.writeFileSync(path.join(root, 'src', file), urlset(entries), 'utf8');
  }

  const sitemapIndex = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemaps.map(([file, , lastmod]) => `  <sitemap>\n    <loc>${siteUrl}/${file}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`),
    '</sitemapindex>',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(root, 'src/sitemap.xml'), sitemapIndex, 'utf8');

  console.log(`Generated sitemap index with ${pageEntries.length} pages, ${countryEntries.length} country pages, ${cityEntries.length} city URLs and ${masjidEntries.length} masjid pages.`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
