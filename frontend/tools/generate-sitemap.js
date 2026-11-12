// Indian Standard Time, like tools/prerender-seo.js: the month pages (NF-010) are the current and next
// month in India, and the nightly build runs on a machine that may be in another zone.
process.env.TZ = 'Asia/Kolkata';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const locations = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/locations.json'), 'utf8'));
const siteUrl = 'https://salah-times.in';
// Today's date in India (TZ above), not UTC: the nightly build runs at 00:05 IST.
const today = (now => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)(new Date());

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

// CR-006: prayer pages (/asr-time, /asr-time/india/indore) come from the shared SEO content.
const ts = require('typescript');
const loadTs = (file) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const module = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(module.exports, require, module);
  return module.exports;
};
const seo = loadTs('src/app/seo/seo-content.ts');
// NF-015 Sunnah Shorts, an optional module: null when it is removed (tools/shorts-pages.js).
const shortsPages = fs.existsSync(path.join(__dirname, 'shorts-pages.js')) ? require('./shorts-pages')({ root, loadTs }) : null;

const staticPages = [
  ['/', 'daily', '1.0', ['src/app/components/dashboard']],
  ['/prayer-times', 'daily', '0.9', prayerTimesSources],
  ['/about', 'monthly', '0.8', ['src/app/components/about']],
  ['/privacy-policy', 'monthly', '0.6', ['src/app/components/privacy-policy']],
  ['/sehri-iftar', 'weekly', '0.7', ['src/app/components/ramzan']],
  ['/zikar', 'monthly', '0.7', ['src/app/components/tasbih']],
  ...(shortsPages ? [shortsPages.staticPage] : []),
  ['/duas', 'monthly', '0.7', ['src/app/components/duas', 'src/assets/data/duas.json']],
  ['/qibla-direction', 'monthly', '0.7', ['src/app/components/qibla-direction']],
  ['/salah-calendar', 'monthly', '0.7', ['src/app/shared/calender']],
  ['/zakat-calculator', 'monthly', '0.7', ['src/app/components/community/zakat-calculator']],
  ['/masjid', 'daily', '0.7', ['src/app/components/community/masjid']],
  ['/blog', 'daily', '0.7', ['src/app/components/blog']]
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

// Prayer pages' titles carry today's times (refreshed by the daily deploy), so they change every day.
const prayerEntries = seo.PRAYER_PAGES.flatMap(page => [
  urlEntry(seo.prayerPageRoute(page), today, 'daily', '0.9'),
  ...seo.PRAYER_PAGE_CITIES.map(city => urlEntry(seo.prayerPageRoute(page, city), today, 'daily', '0.7'))
]);

const citiesLastmod = lastModified([...prayerTimesSources, 'src/assets/locations.json']);
// Country pages (/prayer-times/india ...) list every city in that country.
const countryEntries = [...new Set(locations.map(location => location.country).filter(Boolean).map(slugify))]
  .sort()
  .map(slug => urlEntry(`/prayer-times/${slug}`, citiesLastmod, 'weekly', '0.8'));

// States listed as cities ("Manipur") get no page; tools/prerender-seo.js redirects their old URL.
const cityEntries = [...new Set(locations
  .filter(location => !seo.isStateNameEntry(location, locations))
  .map(location => [location.country, location.city].filter(Boolean).map(slugify).join('/')))]
  .sort()
  .map(slug => urlEntry(`/prayer-times/${slug}`, citiesLastmod, 'daily', '0.9'));

// Indian city pages (Ramadan NF-009 and monthly timetables NF-010 exist for India only: the prerender
// works out Indian Standard Time).
const indianCities = [...new Map(locations
  .filter(location => location.country === 'India' && !seo.isStateNameEntry(location, locations))
  .map(location => [slugify(location.city), location])).values()]
  .sort((a, b) => slugify(a.city).localeCompare(slugify(b.city)));

// NF-009: Ramadan Sehri/Iftar page per Indian city. Before Ramadan the pages don't change, so lastmod
// is the source date; during Ramadan their titles carry today's times, so lastmod is today.
const ramadanSources = ['src/app/components/ramzan', 'src/app/seo', 'src/assets/locations.json'];
const ummAlQuraRamadan = (() => {
  const moment = require('moment-hijri');
  const start = moment(`${seo.RAMADAN.hijriYear}-9-1`, 'iYYYY-iM-iD');
  const end = moment(`${seo.RAMADAN.hijriYear}-10-1`, 'iYYYY-iM-iD').add(1, 'day');
  return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') };
})();
const ramadanLastmod = today >= ummAlQuraRamadan.start && today <= ummAlQuraRamadan.end ? today : lastModified(ramadanSources);
const ramadanEntries = indianCities.map(city => urlEntry(seo.ramadanCityPath(city), ramadanLastmod, 'weekly', '0.7'));

// NF-010: current and next month timetable per Indian city; they change only when the month changes.
const monthSources = ['src/app/components/salahtime/city-month', 'src/app/seo', 'src/assets/locations.json'];
const pageMonths = seo.cityPageMonths(new Date());
const monthSourceDate = lastModified(monthSources);
// A month page changes when its sources change, or on the 1st of the month it was first published.
const monthLastmod = month => {
  const firstOfMonth = `${month.year}-${String(month.month + 1).padStart(2, '0')}-01`;
  return firstOfMonth > monthSourceDate && firstOfMonth <= today ? firstOfMonth : monthSourceDate;
};
const monthEntries = indianCities.flatMap(city => pageMonths.map(month =>
  urlEntry(seo.cityMonthPath(city, month), monthLastmod(month), 'monthly', '0.7')));

// Duas: one page per category (each lists all its duas). A single dua (/duas/<category>/<id>) opens
// as a dialog over that page and canonicalises to it, so it is not listed.
const duaSources = ['src/app/components/duas', 'src/assets/data/duas.json'];
const duaData = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/data/duas.json'), 'utf8'));
const duaEntries = duaData.categories
  .map(category => urlEntry(seo.duaCategoryPath(category), lastModified(duaSources), 'monthly', '0.6'));

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

// ---------------------------------------------------------------- blog articles (NF-003)
// Published articles come from the same API and are cached the same way, for tools/prerender-seo.js.
const blogCacheFile = path.join(root, 'tools/.cache/blog-articles.json');

const loadBlogArticles = async () => {
  try {
    const response = await fetch(`${masjidApiUrl}http-blog/sitemap-list`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const list = await response.json();
    if (!Array.isArray(list)) throw new Error('unexpected response');
    const articles = list.filter(article => article.path && article.title);
    fs.mkdirSync(path.dirname(blogCacheFile), { recursive: true });
    fs.writeFileSync(blogCacheFile, JSON.stringify(articles, null, 2), 'utf8');
    return articles;
  } catch (error) {
    if (fs.existsSync(blogCacheFile)) {
      console.warn(`Blog list unavailable from ${masjidApiUrl} (${error.message}); using the cached copy.`);
      return JSON.parse(fs.readFileSync(blogCacheFile, 'utf8'));
    }
    console.warn(`Blog list unavailable from ${masjidApiUrl} (${error.message}) and no cached copy; no article pages this build.`);
    fs.mkdirSync(path.dirname(blogCacheFile), { recursive: true });
    fs.writeFileSync(blogCacheFile, '[]', 'utf8');
    return [];
  }
};

// ---------------------------------------------------------------- Hijri month adjustments (NF-009)
// Moon-sighting dates entered in Back office → Calendar, the same data the app loads from
// http-calendar/adjustments. Cached for tools/prerender-seo.js (Ramadan city pages); if the API can't
// be reached the last cached copy is used, then the bundled src/assets/calendar-adjustments.json.
const adjustmentsCacheFile = path.join(root, 'tools/.cache/calendar-adjustments.json');

const loadCalendarAdjustments = async () => {
  try {
    const response = await fetch(`${masjidApiUrl}http-calendar/adjustments`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body || !Array.isArray(body.items)) throw new Error('unexpected response');
    fs.mkdirSync(path.dirname(adjustmentsCacheFile), { recursive: true });
    fs.writeFileSync(adjustmentsCacheFile, JSON.stringify(body, null, 2), 'utf8');
    return body.items;
  } catch (error) {
    const fallback = fs.existsSync(adjustmentsCacheFile) ? adjustmentsCacheFile : path.join(root, 'src/assets/calendar-adjustments.json');
    console.warn(`Calendar adjustments unavailable from ${masjidApiUrl} (${error.message}); using ${path.relative(root, fallback)}.`);
    if (fallback !== adjustmentsCacheFile) {
      fs.mkdirSync(path.dirname(adjustmentsCacheFile), { recursive: true });
      fs.copyFileSync(fallback, adjustmentsCacheFile);
    }
    return JSON.parse(fs.readFileSync(adjustmentsCacheFile, 'utf8')).items || [];
  }
};

const main = async () => {
  await loadCalendarAdjustments();
  const masjids = await loadMasjids();
  const articles = await loadBlogArticles();
  const shortsEntries = shortsPages ? await shortsPages.sitemapEntries({ apiUrl: masjidApiUrl, urlEntry, today }) : [];
  const articleLastmod = (article) => String(article.updatedAt || article.publishedAt || '').slice(0, 10) || today;
  // Author pages are listed once per author with a published article.
  const authorPaths = [...new Set(articles.map(article => article.author && article.author.path).filter(Boolean))];
  const blogEntries = [
    ...articles.map(article => urlEntry(article.path, articleLastmod(article), 'weekly', '0.6')),
    ...authorPaths.sort().map(authorPath => urlEntry(authorPath, articles.filter(article => article.author.path === authorPath).map(articleLastmod).sort().pop(), 'weekly', '0.4'))
  ];
  const masjidLastmod = (masjid) => String(masjid.updatedAt || '').slice(0, 10) || today;
  const masjidEntries = masjids
    .slice()
    .sort((a, b) => a.publicPath.localeCompare(b.publicPath))
    .map(masjid => urlEntry(masjid.publicPath, masjidLastmod(masjid), 'weekly', '0.7'));

  const sitemaps = [
    ['sitemap-pages.xml', pageEntries, lastModified(staticPages.flatMap(page => page[3]))],
    ['sitemap-cities.xml', [...countryEntries, ...cityEntries], citiesLastmod],
    ['sitemap-prayers.xml', prayerEntries, today],
    ['sitemap-masjids.xml', masjidEntries, masjids.map(masjidLastmod).sort().pop() || today],
    ['sitemap-blog.xml', blogEntries, articles.map(articleLastmod).sort().pop() || today],
    ['sitemap-duas.xml', duaEntries, lastModified(duaSources)],
    ...(shortsPages ? [['sitemap-shorts.xml', shortsEntries, today]] : []),
    ['sitemap-sehri-iftar.xml', ramadanEntries, ramadanLastmod],
    ['sitemap-months.xml', monthEntries, pageMonths.map(monthLastmod).sort().pop()]
  ];
  // Without the Shorts module its old sitemap must go, or prerender-seo.js would look for its pages.
  if (!shortsPages) fs.rmSync(path.join(root, 'src/sitemap-shorts.xml'), { force: true });

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

  console.log(`Generated sitemap index with ${pageEntries.length} pages, ${countryEntries.length} country pages, ${cityEntries.length} city URLs, ${masjidEntries.length} masjid pages, ${blogEntries.length} blog pages, ${duaEntries.length} dua categories, ${shortsEntries.length} Sunnah cards, ${ramadanEntries.length} Ramadan city pages and ${monthEntries.length} monthly timetables.`);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
