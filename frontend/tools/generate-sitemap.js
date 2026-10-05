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
  ['/zakat-calculator', 'monthly', '0.7', ['src/app/components/community/zakat-calculator']]
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
const cityEntries = [...new Set(locations.map(location => [location.country, location.city].filter(Boolean).map(slugify).join('/')))]
  .sort()
  .map(slug => urlEntry(`/prayer-times/${slug}`, citiesLastmod, 'daily', '0.9'));

const sitemaps = [
  ['sitemap-pages.xml', pageEntries, lastModified(staticPages.flatMap(page => page[3]))],
  ['sitemap-cities.xml', cityEntries, citiesLastmod]
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

console.log(`Generated sitemap index with ${pageEntries.length} pages and ${cityEntries.length} city URLs.`);
