// Writes a static HTML file for every URL in the sitemap (static pages, cities, masjids from
// tools/.cache/masjids.json and blog articles from tools/.cache/blog-articles.json), so crawlers that don't run JavaScript
// (Bing, social previews, AI crawlers) get each page's own title, description, canonical,
// structured data and main text. src/.htaccess serves dist/prerendered/<path>.html when it exists.
//
// Each file is the built index.html with page-specific <head> tags and a static content block
// inside <app-root>; Angular replaces that block when it starts, so users get the normal app.
// The text comes from src/app/seo/seo-content.ts, the same module the app renders at runtime.
//
// Runs after `npm run build` / `npm run build:prod` (postbuild). Usage: node tools/prerender-seo.js [distDir]
//
// CR-006: city and prayer pages carry today's prayer times in their title/description, worked out
// with the app's own WaqtService for the India date. Set before any Date is made, so the times and
// "today" are Indian Standard Time on every build machine (the CI runner is UTC). A daily scheduled
// deploy (.github/workflows/deploy-frontend.yml) keeps them current.
process.env.TZ = 'Asia/Kolkata';
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const distDir = path.resolve(root, process.argv[2] || 'dist/salahtime');
const outDir = path.join(distDir, 'prerendered');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// Load the shared TypeScript content module.
const loadTs = (file, requireFn = require) => {
  const { outputText } = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true }
  });
  const module = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(module.exports, requireFn, module);
  return module.exports;
};
const seo = loadTs('src/app/seo/seo-content.ts');

// The app's prayer-time calculation. Its only imports are Angular's @Injectable (a no-op here) and the
// salah model, which has no imports of its own.
const salahModel = loadTs('src/app/models/salah.model.ts');
const { WaqtService } = loadTs('src/app/services/waqt.service.ts', id => {
  if (id === '@angular/core') return { Injectable: () => target => target };
  if (id.endsWith('/models/salah.model')) return salahModel;
  return require(id);
});
const waqt = new WaqtService();
const defaults = JSON.parse(read('src/assets/default-settings.json'));
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const IST_HOURS = 5.5;
// Times on a date with the app defaults, for Indian cities only (other countries need their own zone).
// SeoCityPageService does the same in the app, so the Ramadan and month pages match.
const timesOn = (location, date) => {
  if (location.country !== 'India') return null;
  const { latitude, longitude } = location.coordinates;
  return waqt.getTimes(date, latitude, longitude, IST_HOURS, defaults.calculationMethod, defaults.madhab, defaults);
};
const timesFor = location => timesOn(location, today);
const farzText = times => times
  ? Object.fromEntries(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map(key => [key, seo.clockTime(times[key].start)]))
  : null;
const en = JSON.parse(read('src/assets/i18n/en.json'));
const translate = (template, params = {}) => template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => params[key] ?? '');

// ---------------------------------------------------------------- inputs

const sitemapUrls = fs.readdirSync(path.join(root, 'src'))
  .filter(file => /^sitemap-.+\.xml$/.test(file))
  .flatMap(file => [...read(`src/${file}`).matchAll(/<url>\s*<loc>https:\/\/salah-times\.in([^<]*)<\/loc>/g)])
  .map(match => match[1]);

// Static pages' SEO from the route definitions (data.seo).
const unquote = value => value.replace(/\\'/g, '\'');
const routeSeo = new Map();
for (const file of ['src/app/app-routing.module.ts', 'src/app/components/community/community.module.ts']) {
  const pattern = /seo:\s*\{\s*title:\s*'((?:[^'\\]|\\.)*)',\s*description:\s*'((?:[^'\\]|\\.)*)',\s*canonicalPath:\s*'([^']*)'/g;
  for (const [, title, description, canonicalPath] of read(file).matchAll(pattern)) {
    routeSeo.set(canonicalPath, { title: unquote(title), description: unquote(description) });
  }
}

const allLocations = JSON.parse(read('src/assets/locations.json'));
// States listed as cities ("Manipur") get no page; their URL redirects to the nearest real city (below).
const stateEntries = allLocations.filter(location => seo.isStateNameEntry(location, allLocations));
const locations = allLocations.filter(location => !stateEntries.includes(location));
const citiesBySlug = new Map();
const countries = new Map();
for (const location of locations) {
  const key = `${seo.citySlug(location.country ?? '')}/${seo.citySlug(location.city)}`;
  if (!citiesBySlug.has(key)) citiesBySlug.set(key, location);
  if (location.country) countries.set(seo.citySlug(location.country), location.country);
}
const citiesIn = (country) => [...citiesBySlug.values()].filter(city => city.country === country);

// Approved masjids, fetched from the API by tools/generate-sitemap.js (prebuild).
const masjidCacheFile = path.join(root, 'tools/.cache/masjids.json');
const masjids = fs.existsSync(masjidCacheFile) ? JSON.parse(fs.readFileSync(masjidCacheFile, 'utf8')) : [];
const masjidsByPath = new Map(masjids.map(masjid => [masjid.publicPath, masjid]));

// Published blog articles (NF-003), fetched by tools/generate-sitemap.js. Their HTML was cleaned by the API.
const blogCacheFile = path.join(root, 'tools/.cache/blog-articles.json');
const blogArticles = fs.existsSync(blogCacheFile) ? JSON.parse(fs.readFileSync(blogCacheFile, 'utf8')) : [];
const blogByPath = new Map(blogArticles.map(article => [article.path, article]));

// ---------------------------------------------------------------- html helpers

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (href, text) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
const cityLabel = city => [city.city, city.state, city.country]
  .filter(Boolean)
  .join(', ');
const cityHref = city => seo.cityRoute(city).join('/');
// Lists of bare links (cities, masjids) are laid out in columns; see src/styles/_seo-prerender.scss.
const linkList = items => `<ul${items.every(item => /^<a [^>]*>[^<]*<\/a>$/.test(item)) ? ' class="seo-link-grid"' : ''}>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const faqHtml = (items, headingTag = 'h3') =>
  items.map(item => `<${headingTag}>${escapeHtml(item.question)}</${headingTag}><p>${escapeHtml(item.answer)}</p>`).join('');
const jsonLd = (id, data) =>
  `<script type="application/ld+json"${id ? ` id="${id}"` : ''}>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// The theme stylesheet (assets/css/app.css) is not part of the Angular build. Link it in the HTML, after
// the build's styles (same order AppComponent used to add it in), so the first paint is already themed
// instead of showing unstyled content until JavaScript runs. AppComponent skips it when this id exists.
const indexFile = path.join(distDir, 'index.html');
const themeCss = '<link id="adminuiux-template-css" rel="stylesheet" href="assets/css/app.css">';
let shell = fs.readFileSync(indexFile, 'utf8');
if (!shell.includes(themeCss)) {
  const buildCss = /<link rel="stylesheet" href="styles\.[0-9a-f]+\.css">/;
  if (!buildCss.test(shell)) {
    throw new Error('index.html is missing a render-blocking styles.<hash>.css link (keep inlineCritical off in angular.json)');
  }
  shell = shell.replace(buildCss, match => match + themeCss);
  fs.writeFileSync(indexFile, shell, 'utf8');
}
const template = shell;
const requireMatch = (pattern, what) => {
  if (!pattern.test(template)) throw new Error(`index.html is missing ${what}`);
};
requireMatch(/<title>[^<]*<\/title>/, '<title>');
// The shell has no canonical or og:url: pages the app renders client-side get theirs from JavaScript,
// so only prerendered pages carry them in the raw HTML.
if (/rel="canonical"|property="og:url"/.test(template)) {
  throw new Error('index.html must not have a canonical link or og:url; they are added per page');
}
requireMatch(/<app-root><\/app-root>/, 'an empty <app-root>');

const setMeta = (html, attr, key, value) => {
  const pattern = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  if (!pattern.test(html)) throw new Error(`index.html is missing <meta ${attr}="${key}">`);
  return html.replace(pattern, `$1${escapeHtml(value)}$2`);
};

const renderPage = ({ title, description, url, schemas = [], body, image = null, blogStyles = false }) => {
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  // Pages with their own share image (blog covers, 1200 × 630) replace the default one.
  if (image) {
    html = setMeta(html, 'property', 'og:image', image.url);
    html = setMeta(html, 'property', 'og:image:width', '1200');
    html = setMeta(html, 'property', 'og:image:height', '630');
    html = setMeta(html, 'property', 'og:image:alt', image.alt);
    html = setMeta(html, 'name', 'twitter:image', image.url);
  }
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'name', 'robots', 'index, follow');
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  const pageTags = [
    // Blog pages use blog.css, a separate bundle; same id as BlogModule's link so it is not added twice.
    ...(blogStyles ? ['<link id="blog-styles" rel="stylesheet" href="blog.css">'] : []),
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    ...schemas.map(([id, data]) => jsonLd(id, data))
  ];
  html = html.replace('</head>', `${pageTags.join('')}</head>`);
  // Sections use the app's card markup so the static page looks like the app until Angular replaces it.
  const cards = body
    .replace(/<section>/g, '<section class="card adminuiux-card mb-3"><div class="card-body">')
    .replace(/<\/section>/g, '</div></section>');
  return html.replace('<app-root></app-root>', `<app-root><main class="container py-4 seo-prerender">${cards}</main></app-root>`);
};

// ---------------------------------------------------------------- page builders

const cityContentSection = city => [
  `<section><h2>${escapeHtml(seo.cityIntroTitle(city))}</h2><p>${escapeHtml(seo.cityIntroDescription(city))}</p>`,
  `<h3>${escapeHtml(seo.cityFocusHeading(city))}</h3>`,
  seo.cityFocusItems(city).map(item => `<h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.body)}</p>`).join(''),
  `<h3>Prayer Times FAQ</h3>${faqHtml(seo.cityFaqItems(city), 'h4')}</section>`
].join('');

const prayerLinksSection = city =>
  `<section><h2>Each prayer time today</h2>${linkList(seo.prayerPageLinks(city).map(item => link(item.link, item.name)))}</section>`;

const buildCity = city => {
  const meta = seo.cityPageMeta(city, farzText(timesFor(city)));
  const countrySlug = seo.citySlug(city.country ?? '');
  // Nearest cities first (same list the app shows), so each city links its neighbours.
  const nearby = seo.nearbyCities(city, locations, 12);
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link('/prayer-times', 'Prayer Times')} › ${link(`/prayer-times/${countrySlug}`, city.country)}</nav>`,
    `<h1>${escapeHtml(translate(en.SALAHTIME.SEO_TITLE_CITY, { city: city.city, country: city.country }))}</h1>`,
    `<p>${escapeHtml(translate(en.SALAHTIME.SEO_DESC_CITY, { city: city.city, country: city.country }))}</p>`,
    cityContentSection(city),
    prayerLinksSection(city),
    // NF-009 / NF-010: the city's monthly timetables and Ramadan timetable (same links as the app).
    city.country === 'India'
      ? `<section><h2>${escapeHtml(city.city)} timetables</h2>${linkList([
        ...seo.cityPageMonths(today).map(month => link(seo.cityMonthPath(city, month), `${seo.monthName(month)} prayer timetable`)),
        link(seo.ramadanCityPath(city), `Ramadan ${seo.RAMADAN.gregorianYear} Sehri and Iftar timetable`)
      ])}</section>`
      : '',
    `<section><h2>${escapeHtml(seo.nearbyCitiesHeading(city))}</h2>`,
    linkList(nearby.map(other => link(cityHref(other), other.city))),
    `<p>${link(`/prayer-times/${countrySlug}`, `All cities in ${city.country}`)}</p></section>`
  ].join('');
  return renderPage({ ...meta, schemas: [['city-prayer-times-schema', seo.cityPageSchema(city)]], body });
};

const buildPrayerTimesIndex = () => {
  const meta = seo.cityPageMeta(null);
  const body = [
    `<h1>${escapeHtml(en.SALAHTIME.SEO_TITLE_DEFAULT)}</h1><p>${escapeHtml(en.SALAHTIME.SEO_DESC_DEFAULT)}</p>`,
    cityContentSection(null),
    prayerLinksSection(null),
    `<section><h2>Prayer times by country</h2>`,
    linkList([...countries].sort((a, b) => a[1].localeCompare(b[1])).map(([slug, name]) => link(`/prayer-times/${slug}`, name))),
    `<h2>Popular cities</h2>`,
    linkList(seo.HOME_POPULAR_CITIES.map(city => link(cityHref({ ...city, country: 'India' }), cityLabel(city)))),
    `</section>`
  ].join('');
  return renderPage({ ...meta, schemas: [['city-prayer-times-schema', seo.cityPageSchema(null)]], body });
};

const buildCountry = (slug, country) => {
  const meta = seo.countryPageMeta(country);
  const cities = citiesIn(country).sort((a, b) => a.city.localeCompare(b.city));
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link('/prayer-times', 'Prayer Times')}</nav>`,
    `<h1>${escapeHtml(meta.heading)}</h1><p>Choose a city to view its prayer times.</p>`,
    `<p>${cities.length} ${cities.length === 1 ? 'city' : 'cities'}</p>`,
    linkList(cities.map(city => link(cityHref(city), cityLabel(city))))
  ].join('');
  return renderPage({ ...meta, body });
};

const buildHome = () => {
  const route = routeSeo.get('/');
  if (!route) throw new Error('No data.seo for the home route');
  const body = [
    `<h1>${escapeHtml(en.DASHBOARD.PAGE_TITLE)}</h1>`,
    `<section><h2>${escapeHtml(seo.HOME_INTRO_TITLE)}</h2>${seo.HOME_INTRO_PARAGRAPHS.map(p => `<p>${escapeHtml(p)}</p>`).join('')}`,
    `<h3>More Islamic tools</h3>`,
    linkList(seo.HOME_TOOL_LINKS.map(tool => `${link(tool.route, tool.title)} — ${escapeHtml(tool.description)}`)),
    `</section>`,
    prayerLinksSection(null),
    `<section><h2>Prayer times in popular cities</h2>`,
    `<p>Today's Fajr, Dhuhr, Asr, Maghrib and Isha times for cities across India.</p>`,
    linkList(seo.HOME_POPULAR_CITIES.map(city => link(cityHref({ ...city, country: 'India' }), cityLabel(city)))),
    `<p>${link('/prayer-times/india', 'Browse all cities in India')}</p></section>`,
    `<section><h2>Salah FAQ</h2>${faqHtml(seo.HOME_FAQ_ITEMS)}</section>`
  ].join('');
  return renderPage({
    ...route,
    url: `${seo.SITE_URL}/`,
    schemas: [['dashboard-faq-schema', { '@context': 'https://schema.org', ...seo.faqPageSchema(seo.HOME_FAQ_ITEMS) }]],
    body
  });
};

// ---------------------------------------------------------------- prayer pages (CR-006)
// Same sections as PrayerFocusComponent. The page without a city shows New Delhi, as the app does
// for a visitor with no saved location.

const locationOf = seoCity => citiesBySlug.get(`${seo.citySlug(seoCity.country ?? '')}/${seo.citySlug(seoCity.city)}`);

const buildPrayerPage = (page, city) => {
  const shown = locationOf(city ?? seo.DEFAULT_PRAYER_PAGE_CITY);
  if (!shown) throw new Error(`Prayer page city ${(city ?? seo.DEFAULT_PRAYER_PAGE_CITY).city} is not in locations.json`);
  const times = timesFor(shown);
  const window = { start: seo.clockTime(times[page.key].start), end: seo.clockTime(times[page.key].end) };
  const rows = seo.PRAYER_PAGE_CITIES.map(other => {
    const location = locationOf(other);
    return location ? { city: other, start: seo.clockTime(timesFor(location)[page.key].start) } : null;
  }).filter(Boolean);
  const samples = city ? [] : rows.filter(row => ['New Delhi', 'Mumbai', 'Hyderabad'].includes(row.city.city))
    .map(row => ({ city: row.city.city, start: row.start }));
  const meta = seo.prayerPageMeta(page, city, city ? window : null, samples);
  const dateText = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const farz = [['fajr', 'Fajr'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']];
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(`/${page.slug}`, `${page.name} Time`)}${city ? ` › ${escapeHtml(city.city)}` : ''}</nav>`,
    `<h1>${escapeHtml(seo.prayerPageHeading(page, city))}</h1><p>${escapeHtml(seo.prayerPageIntro(page, city))}</p>`,
    `<section><h2>${escapeHtml(page.name)} ${page.kind === 'makruh' ? 'window' : 'time'} today in ${escapeHtml(shown.city)}</h2>`,
    `<p><strong>${escapeHtml(window.start)}</strong> to ${escapeHtml(window.end)}</p>`,
    `<p>${escapeHtml(dateText)} · Karachi method, Hanafi Asr</p>`,
    `<h3>All prayer times today in ${escapeHtml(shown.city)}</h3>`,
    `<p>${farz.map(([key, name]) => `${name} ${escapeHtml(seo.clockTime(times[key].start))}`).join(' · ')}</p>`,
    `<p>${link(cityHref(shown), `Full timetable for ${shown.city} with Ishraq, Chasht and Tahajjud`)}</p></section>`,
    `<section><h2>${escapeHtml(page.name)} time today in cities of India</h2>`,
    linkList(rows.map(row => `${link(seo.prayerPageRoute(page, row.city), row.city.city)} ${escapeHtml(row.start)}`)),
    `</section><section><h2>About ${escapeHtml(page.name)}</h2>${page.about.map(p => `<p>${escapeHtml(p)}</p>`).join('')}`,
    `<h2>${escapeHtml(page.name)} FAQ</h2>${faqHtml(seo.prayerPageFaq(page, city))}</section>`,
    `<section><h2>Other prayer times${city ? ` in ${escapeHtml(city.city)}` : ''}</h2>`,
    linkList(seo.PRAYER_PAGES.filter(other => other !== page).map(other => link(seo.prayerPageRoute(other, city), `${other.name} time`))),
    `</section>`
  ].join('');
  return renderPage({ ...meta, schemas: [['prayer-page-schema', seo.prayerPageSchema(page, city, meta)]], body });
};

const masjidLabel = masjid => [masjid.name, masjid.area, masjid.city]
  .filter((part, index, all) => !!part && all.indexOf(part) === index).join(', ');

const buildMasjid = masjid => {
  const seoMasjid = { ...masjid, images: masjid.coverThumbUrl ? [{ url: masjid.coverThumbUrl }] : [] };
  const meta = seo.masjidPageMeta(seoMasjid);
  const address = seo.masjidAddress(masjid);
  const timings = (masjid.timings || []).filter(timing => timing.salah);
  const cityPage = masjid.city ? locations.find(location => location.city === masjid.city) : null;
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(seo.MASJID_LIST_PATH, 'Masjids')}</nav>`,
    `<h1>${escapeHtml(masjid.name)}</h1>`,
    address ? `<p>${escapeHtml(address)}</p>` : '',
    `<p>${escapeHtml(seo.masjidIntro(masjid))}</p>`,
    timings.length
      ? `<section><h2>Salah timing</h2><table><thead><tr><th>Prayer</th><th>Azan</th><th>Jamat</th></tr></thead><tbody>${
        timings.map(timing => `<tr><td>${escapeHtml(timing.salah)}</td><td>${escapeHtml(timing.azan || '-')}</td><td>${escapeHtml(timing.jamat || '-')}</td></tr>`).join('')
      }</tbody></table></section>`
      : '',
    cityPage ? `<p>${link(cityHref(cityPage), `Prayer times in ${cityLabel(cityPage)}`)}</p>` : '',
    `<p>${link(seo.MASJID_LIST_PATH, 'All masjids')}</p>`
  ].join('');
  return renderPage({ ...meta, schemas: [['masjid-schema', seo.masjidPageSchema(seoMasjid)]], body });
};

// /masjid lists every public masjid, so each one is reachable from the home page in two clicks.
const buildMasjidIndex = () => {
  const route = routeSeo.get(seo.MASJID_LIST_PATH);
  if (!route) throw new Error(`No data.seo with canonicalPath '${seo.MASJID_LIST_PATH}'`);
  const sorted = masjids.slice().sort((a, b) => masjidLabel(a).localeCompare(masjidLabel(b)));
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')}</nav>`,
    `<h1>Masjids</h1><p>${escapeHtml(route.description)}</p>`,
    sorted.length ? linkList(sorted.map(masjid => link(masjid.publicPath, masjidLabel(masjid)))) : ''
  ].join('');
  return renderPage({ ...route, url: `${seo.SITE_URL}${seo.MASJID_LIST_PATH}`, body });
};

// ---------------------------------------------------------------- blog (NF-003)

const buildBlogArticle = article => {
  const meta = seo.blogArticleMeta(article);
  const related = blogArticles.filter(other => other !== article && other.category === article.category).slice(0, 5);
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(seo.BLOG_LIST_PATH, 'Blog')}</nav>`,
    `<article><h1>${escapeHtml(article.title)}</h1>`,
    `<p>By ${article.author.path ? link(article.author.path, article.author.name) : escapeHtml(article.author.name)}`
      + ` · ${escapeHtml(String(article.publishedAt || '').slice(0, 10))} · ${article.readingMinutes} min read</p>`,
    article.coverImageUrl ? `<img src="${escapeHtml(article.coverImageUrl)}" alt="${escapeHtml(article.coverAlt || '')}" width="1200" height="630">` : '',
    `<div class="blog-content">${article.contentHtml}</div>`,
    article.references ? `<h2>References</h2><p>${escapeHtml(article.references).replace(/\r?\n/g, '<br>')}</p>` : '',
    '</article>',
    related.length ? `<section><h2>More articles</h2>${linkList(related.map(other => link(other.path, other.title)))}</section>` : '',
    `<p>${link(seo.BLOG_LIST_PATH, 'All articles')}</p>`
  ].join('');
  return renderPage({
    ...meta,
    image: article.coverImageUrl ? { url: article.coverImageUrl, alt: article.coverAlt || article.title } : null,
    schemas: [['blog-schema', seo.blogArticleSchema(article)]],
    body,
    blogStyles: true
  });
};

const buildBlogIndex = () => {
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')}</nav>`,
    `<h1>SalahTime Blog</h1><p>${escapeHtml(seo.BLOG_LIST_INTRO)}</p>`,
    blogArticles.length
      ? `<section><h2>Latest articles</h2><ul>${blogArticles.map(article => `<li>${link(article.path, article.title)} — ${escapeHtml(article.excerpt || '')}</li>`).join('')}</ul></section>`
      : ''
  ].join('');
  return renderPage({ ...seo.BLOG_LIST_META, body, blogStyles: true });
};

const buildBlogAuthor = authorPath => {
  const written = blogArticles.filter(article => article.author.path === authorPath);
  if (!written.length) throw new Error(`Sitemap author ${authorPath} has no article in ${path.relative(root, blogCacheFile)}`);
  const author = written[0].author;
  const meta = seo.blogAuthorMeta({ name: author.name, path: authorPath }, written.length);
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(seo.BLOG_LIST_PATH, 'Blog')}</nav>`,
    `<h1>Articles by ${escapeHtml(author.name)}</h1>`,
    linkList(written.map(article => link(article.path, article.title)))
  ].join('');
  return renderPage({ ...meta, body, blogStyles: true });
};

const buildStatic = url => {
  const route = routeSeo.get(url);
  if (!route) throw new Error(`No data.seo with canonicalPath '${url}' for sitemap URL ${url}`);
  const heading = route.title.replace(/\s*\|\s*SalahTime.*$/, '').replace(/^SalahTime\s*-\s*/, '');
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')}</nav>`,
    `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(route.description)}</p>`,
    `<section><h2>More from SalahTime</h2>`,
    linkList(seo.HOME_TOOL_LINKS.filter(tool => tool.route !== url).map(tool => link(tool.route, tool.title))),
    `</section>`
  ].join('');
  return renderPage({ ...route, url: `${seo.SITE_URL}${url}`, body });
};

// ---------------------------------------------------------------- duas and learn
// One page per dua category and per Learn topic, with all their text. A single dua opens as a dialog
// over its category page, and a Learn step or quiz is part of its topic, so those URLs get a copy of
// the parent page (same canonical) and the app opens the dialog / step on top of it.

const duaData = { categories: seo.duaCategoriesFromData(JSON.parse(read('src/assets/data/duas.json'))) };
const duaCategories = new Map(duaData.categories.map(category => [category.slug, category]));
const learnData = JSON.parse(read('src/assets/data/learn.json'));
const learnTopics = new Map(learnData.topics.map(topic => [topic.id, seo.learnTopicFromData(topic)]));

const buildDuasHub = () => {
  const route = routeSeo.get(seo.DUA_LIST_PATH);
  if (!route) throw new Error(`No data.seo with canonicalPath '${seo.DUA_LIST_PATH}'`);
  const heading = route.title.replace(/\s*\|\s*SalahTime.*$/, '');
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')}</nav>`,
    `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(route.description)}</p>`,
    `<section><h2>Dua categories</h2><ul>${duaData.categories.map(category =>
      `<li>${link(seo.duaCategoryPath(category), `${category.title} duas`)}${category.description ? ` — ${escapeHtml(category.description)}` : ''}</li>`
    ).join('')}</ul></section>`
  ].join('');
  return renderPage({ ...route, url: `${seo.SITE_URL}${seo.DUA_LIST_PATH}`, body });
};

const buildDuaCategory = category => {
  const meta = seo.duaCategoryMeta(category);
  const others = duaData.categories.filter(other => other !== category);
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(seo.DUA_LIST_PATH, 'Duas')}</nav>`,
    `<h1>${escapeHtml(meta.heading)}</h1>`,
    category.description ? `<p>${escapeHtml(category.description)}</p>` : '',
    ...category.duas.map(dua => [
      `<section><h2>${escapeHtml(dua.title)}</h2>`,
      dua.arabic ? `<p lang="ar" dir="rtl">${escapeHtml(dua.arabic)}</p>` : '',
      dua.transliteration ? `<p><em>${escapeHtml(dua.transliteration)}</em></p>` : '',
      dua.translation ? `<p>${escapeHtml(dua.translation)}</p>` : '',
      dua.reference ? `<p>Reference: ${escapeHtml(dua.reference)}</p>` : '',
      `</section>`
    ].join('')),
    `<section><h2>More duas</h2>${linkList(others.map(other => link(seo.duaCategoryPath(other), `${other.title} duas`)))}</section>`
  ].join('');
  return renderPage({ ...meta, schemas: [['dua-category-schema', seo.duaCategorySchema(category)]], body });
};

const buildLearnHub = () => {
  const route = routeSeo.get(seo.LEARN_LIST_PATH);
  if (!route) throw new Error(`No data.seo with canonicalPath '${seo.LEARN_LIST_PATH}'`);
  const heading = route.title.replace(/\s*\|\s*SalahTime.*$/, '');
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')}</nav>`,
    `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(route.description)}</p>`,
    ...[...learnTopics.values()].map(topic => [
      `<section><h2>${link(seo.learnTopicPath(topic), topic.title)}</h2>`,
      topic.summary ? `<p>${escapeHtml(topic.summary)}</p>` : '',
      `<ul>${topic.entries.map(entry => `<li>${escapeHtml(entry.title)}${entry.ruling ? ` (${escapeHtml(seo.learnRulingName(entry.ruling))})` : ''}</li>`).join('')}</ul>`,
      `</section>`
    ].join(''))
  ].join('');
  return renderPage({ ...route, url: `${seo.SITE_URL}${seo.LEARN_LIST_PATH}`, body });
};

const buildLearnTopic = topic => {
  const meta = seo.learnTopicMeta(topic);
  const others = [...learnTopics.values()].filter(other => other !== topic);
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(seo.LEARN_LIST_PATH, 'Learn')}</nav>`,
    `<h1>${escapeHtml(meta.heading)}</h1>`,
    topic.summary ? `<p>${escapeHtml(topic.summary)}</p>` : '',
    ...topic.entries.map(entry => [
      `<section><h2>${escapeHtml(entry.title)}${entry.ruling ? ` <small>(${escapeHtml(seo.learnRulingName(entry.ruling))})</small>` : ''}</h2>`,
      entry.summary ? `<p>${escapeHtml(entry.summary)}</p>` : '',
      entry.steps.length > 1 ? `<ol>${entry.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : entry.steps.map(step => `<p>${escapeHtml(step)}</p>`).join(''),
      entry.note ? `<p>${escapeHtml(entry.note)}</p>` : '',
      entry.missed ? `<p><strong>If missed:</strong> ${escapeHtml(entry.missed)}</p>` : '',
      `</section>`
    ].join('')),
    others.length ? `<section><h2>More to learn</h2>${linkList(others.map(other => link(seo.learnTopicPath(other), other.title)))}</section>` : ''
  ].join('');
  return renderPage({ ...meta, schemas: [['learn-topic-schema', seo.learnTopicSchema(topic)]], body });
};

// ---------------------------------------------------------------- Ramadan city pages (NF-009)
// Ramadan dates: the back-office adjustment for India when one exists, else Umm al-Qura + 1 day
// (seo.ramadanRange; HijriCalendarService.monthAdjustment applies the same rule in the app).

const indianCities = [...new Map(locations.filter(city => city.country === 'India')
  .map(city => [seo.citySlug(city.city), city])).values()]
  .sort((a, b) => a.city.localeCompare(b.city));

const ramadanRangeIndia = (() => {
  const moment = require('moment-hijri');
  const year = seo.RAMADAN.hijriYear;
  const start = moment(`${year}-9-1`, 'iYYYY-iM-iD');
  const days = moment(`${year}-10-1`, 'iYYYY-iM-iD').diff(start, 'days');
  const startDate = start.toDate();
  const cacheFile = path.join(root, 'tools/.cache/calendar-adjustments.json');
  const source = fs.existsSync(cacheFile) ? cacheFile : path.join(root, 'src/assets/calendar-adjustments.json');
  const items = (JSON.parse(fs.readFileSync(source, 'utf8')).items || [])
    .filter(item => item.isActive && item.hijriYear === year && item.hijriMonth === 9);
  const override = items.find(item => item.countrySlug === 'india') || items.find(item => !item.countrySlug) || null;
  return seo.ramadanRange({ start: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()), days }, 'india', override);
})();

const ramadanRowsFor = city => seo.ramadanDays(ramadanRangeIndia, date => {
  const times = timesOn(city, date);
  return { sahri: times.sahri.start, iftar: times.iftar.start };
});

const buildRamadanHub = () => {
  const route = routeSeo.get(seo.RAMADAN_LIST_PATH);
  if (!route) throw new Error(`No data.seo with canonicalPath '${seo.RAMADAN_LIST_PATH}'`);
  const heading = route.title.replace(/\s*\|\s*SalahTime.*$/, '');
  const first = ramadanRangeIndia.start;
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')}</nav>`,
    `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(route.description)}</p>`,
    `<p>Ramadan ${seo.RAMADAN.gregorianYear} in India is expected to begin on ${escapeHtml(seo.longDate(first))}, subject to the sighting of the moon.</p>`,
    `<section><h2>Ramadan ${seo.RAMADAN.gregorianYear} Sehri and Iftar timetable by city</h2>`,
    linkList(seo.HOME_POPULAR_CITIES.map(city => link(seo.ramadanCityPath({ ...city, country: 'India' }), city.city))),
    `<h3>All cities in India</h3>`,
    linkList(indianCities.map(city => link(seo.ramadanCityPath(city), city.city))),
    `</section>`
  ].join('');
  return renderPage({ ...route, url: `${seo.SITE_URL}${seo.RAMADAN_LIST_PATH}`, body });
};

const buildRamadanCity = city => {
  const rows = ramadanRowsFor(city);
  const todayRow = seo.ramadanToday(rows, today);
  const meta = seo.ramadanCityMeta(city, rows, todayRow);
  const faq = seo.ramadanCityFaq(city, rows);
  const nearby = seo.nearbyCities(city, indianCities, 12);
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(seo.RAMADAN_LIST_PATH, 'Sehri and Iftar')} › ${escapeHtml(city.city)}</nav>`,
    `<h1>${escapeHtml(seo.ramadanCityHeading(city))}</h1>`,
    `<section>${seo.ramadanCityIntro(city, rows, ramadanRangeIndia).map(p => `<p>${escapeHtml(p)}</p>`).join('')}</section>`,
    todayRow ? `<section><h2>Today in ${escapeHtml(city.city)} – Ramadan day ${todayRow.day}</h2><p>${escapeHtml(seo.longDate(todayRow.date))}</p>`
      + `<p><strong>Sehri ends ${escapeHtml(todayRow.sehri)} · Iftar ${escapeHtml(todayRow.iftar)}</strong></p></section>` : '',
    `<section><h2>Ramadan ${seo.RAMADAN.gregorianYear} Sehri and Iftar timetable for ${escapeHtml(city.city)}</h2>`,
    `<table class="table table-sm"><thead><tr><th>Day</th><th>Date</th><th>Sehri ends</th><th>Iftar</th></tr></thead><tbody>`,
    rows.map(row => `<tr><td>${row.day}${row.depends ? '*' : ''}</td><td>${escapeHtml(row.dateText)}</td><td>${escapeHtml(row.sehri)}</td><td>${escapeHtml(row.iftar)}</td></tr>`).join(''),
    `</tbody></table>`,
    rows[rows.length - 1].depends ? '<p>* Only if the Shawwal moon is not seen on the evening of day 29.</p>' : '',
    `</section>`,
    `<section><h2>Ramadan ${seo.RAMADAN.gregorianYear} FAQ for ${escapeHtml(city.city)}</h2>${faqHtml(faq)}</section>`,
    `<section><h2>Sehri and Iftar in cities near ${escapeHtml(city.city)}</h2>${linkList(nearby.map(other => link(seo.ramadanCityPath(other), other.city)))}</section>`,
    `<p>${link(cityHref(city), `Prayer times in ${city.city} today`)} · ${link(seo.RAMADAN_LIST_PATH, 'Sehri and Iftar in other cities')}</p>`
  ].join('');
  return renderPage({ ...meta, schemas: [['ramadan-city-schema', seo.ramadanCitySchema(city, meta, faq)]], body });
};

// ---------------------------------------------------------------- monthly timetables (NF-010)

const pageMonths = seo.cityPageMonths(today);

const buildCityMonth = (city, month) => {
  const rows = seo.cityMonthRows(month, date => {
    const t = timesOn(city, date);
    return { fajr: t.fajr.start, tulu: t.tulu.start, dhuhr: t.dhuhr.start, asr: t.asr.start, maghrib: t.maghrib.start, isha: t.isha.start };
  });
  const meta = seo.cityMonthMeta(city, month, rows);
  const label = seo.monthName(month);
  const others = pageMonths.filter(other => other.year !== month.year || other.month !== month.month);
  const nearby = seo.nearbyCities(city, indianCities, 12);
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link('/prayer-times', 'Prayer Times')} › ${link(cityHref(city), city.city)} › ${escapeHtml(label)}</nav>`,
    `<h1>${escapeHtml(seo.cityMonthHeading(city, month))}</h1><p>${escapeHtml(seo.cityMonthIntro(city, month))}</p>`,
    `<p>${[link(cityHref(city), `Today's prayer times in ${city.city}`), ...others.map(other => link(seo.cityMonthPath(city, other), `${seo.monthName(other)} timetable`))].join(' · ')}</p>`,
    `<section><h2>${escapeHtml(city.city)} namaz timetable for ${escapeHtml(label)}</h2>`,
    `<table class="table table-sm"><thead><tr><th>Date</th><th>Fajr</th><th>Sunrise</th><th>Dhuhr</th><th>Asr</th><th>Maghrib</th><th>Isha</th></tr></thead><tbody>`,
    rows.map(row => `<tr><td>${escapeHtml(row.dateText)}${row.friday ? ' (Jumu\'ah)' : ''}</td><td>${row.fajr}</td><td>${row.sunrise}</td><td>${row.dhuhr}</td><td>${row.asr}</td><td>${row.maghrib}</td><td>${row.isha}</td></tr>`).join(''),
    `</tbody></table><p>Karachi method, Hanafi Asr. Your masjid's jamaat times may differ.</p></section>`,
    `<section><h2>${escapeHtml(label)} prayer times in cities near ${escapeHtml(city.city)}</h2>${linkList(nearby.map(other => link(seo.cityMonthPath(other, month), other.city)))}</section>`
  ].join('');
  return renderPage({ ...meta, schemas: [['city-month-schema', seo.cityMonthSchema(city, month, meta)]], body });
};

// ---------------------------------------------------------------- write

fs.rmSync(outDir, { recursive: true, force: true });
const counts = { home: 0, index: 0, country: 0, city: 0, prayer: 0, masjid: 0, blog: 0, dua: 0, learn: 0, ramadan: 0, month: 0, static: 0 };
for (const url of sitemapUrls) {
  const parts = url.split('/').filter(Boolean);
  const prayerPage = seo.prayerPageBySlug(parts[0] ?? '');
  let html;
  if (url === '/') { html = buildHome(); counts.home++; }
  else if (prayerPage && (parts.length === 1 || parts.length === 3)) {
    const city = parts.length === 3 ? seo.prayerPageCity(parts[1], parts[2]) : null;
    if (parts.length === 3 && !city) throw new Error(`Sitemap prayer page ${url} is not in PRAYER_PAGE_CITIES`);
    html = buildPrayerPage(prayerPage, city); counts.prayer++;
  }
  else if (url === seo.MASJID_LIST_PATH) { html = buildMasjidIndex(); counts.static++; }
  else if (parts[0] === 'masjid' && parts.length === 3) {
    const masjid = masjidsByPath.get(url);
    if (!masjid) throw new Error(`Sitemap masjid ${url} is not in ${path.relative(root, masjidCacheFile)}`);
    html = buildMasjid(masjid); counts.masjid++;
  }
  else if (url === seo.BLOG_LIST_PATH) { html = buildBlogIndex(); counts.blog++; }
  else if (parts[0] === 'blog' && parts[1] === 'author' && parts.length === 3) { html = buildBlogAuthor(url); counts.blog++; }
  else if (parts[0] === 'blog' && parts.length === 2) {
    const article = blogByPath.get(url);
    if (!article) throw new Error(`Sitemap article ${url} is not in ${path.relative(root, blogCacheFile)}`);
    html = buildBlogArticle(article); counts.blog++;
  }
  else if (url === seo.DUA_LIST_PATH) { html = buildDuasHub(); counts.static++; }
  else if (parts[0] === 'duas' && parts.length === 2) {
    const category = duaCategories.get(parts[1]);
    if (!category) throw new Error(`Sitemap dua category ${url} is not in duas.json`);
    html = buildDuaCategory(category); counts.dua++;
  }
  else if (url === seo.LEARN_LIST_PATH) { html = buildLearnHub(); counts.static++; }
  else if (parts[0] === 'learn' && parts.length === 2) {
    const topic = learnTopics.get(parts[1]);
    if (!topic) throw new Error(`Sitemap learn topic ${url} is not in learn.json`);
    html = buildLearnTopic(topic); counts.learn++;
  }
  else if (url === seo.RAMADAN_LIST_PATH) { html = buildRamadanHub(); counts.static++; }
  else if (parts[0] === 'sehri-iftar' && parts.length === 3) {
    const city = citiesBySlug.get(`${parts[1]}/${parts[2]}`);
    if (!city || city.country !== 'India') throw new Error(`Sitemap Ramadan page ${url} is not an Indian city in locations.json`);
    html = buildRamadanCity(city); counts.ramadan++;
  }
  else if (parts[0] === 'prayer-times' && parts.length === 4) {
    const city = citiesBySlug.get(`${parts[1]}/${parts[2]}`);
    const month = seo.parseMonthSlug(parts[3]);
    if (!city || city.country !== 'India' || !month) throw new Error(`Sitemap month page ${url} is not an Indian city month`);
    html = buildCityMonth(city, month); counts.month++;
  }
  else if (url === '/prayer-times') { html = buildPrayerTimesIndex(); counts.index++; }
  else if (parts[0] === 'prayer-times' && parts.length === 2 && countries.has(parts[1])) { html = buildCountry(parts[1], countries.get(parts[1])); counts.country++; }
  else if (parts[0] === 'prayer-times' && parts.length === 3) {
    const city = citiesBySlug.get(`${parts[1]}/${parts[2]}`);
    if (!city) throw new Error(`Sitemap city ${url} is not in locations.json`);
    html = buildCity(city); counts.city++;
  } else { html = buildStatic(url); counts.static++; }

  const file = url === '/' ? path.join(outDir, 'index.html') : path.join(outDir, `${url.slice(1)}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf8');
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
if (total !== sitemapUrls.length) throw new Error(`Prerendered ${total} pages for ${sitemapUrls.length} sitemap URLs`);

// ---------------------------------------------------------------- old city URLs
// City pages used to live at /prayer-times/<city>; Google still has many of those indexed.
// Each one gets a page that permanently redirects to /prayer-times/<country>/<city>
// (Google treats an instant meta refresh as a 301) and carries the new canonical.
// The target is the city the app itself picks for that URL: the first match in locations.json.
// Slugs that are also country names stay country pages.
const legacyTargets = new Map();
for (const location of locations) {
  const slug = seo.citySlug(location.city);
  if (slug && !countries.has(slug) && !legacyTargets.has(slug)) legacyTargets.set(slug, location);
}

const buildLegacyRedirect = city => {
  const target = cityHref(city);
  const { title } = seo.cityPageMeta(city);
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="canonical" href="${escapeHtml(seo.SITE_URL + target)}">`,
    `<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">`,
    // Keep query string and fragment (e.g. ?format=24) when JavaScript is available.
    `<script>location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')} + location.search + location.hash);</script>`,
    '</head><body>',
    `<p>This page has moved to ${link(target, `Prayer times in ${cityLabel(city)}`)}.</p>`,
    '</body></html>'
  ].join('');
};

for (const [slug, city] of legacyTargets) {
  const file = path.join(outDir, 'prayer-times', `${slug}.html`);
  fs.writeFileSync(file, buildLegacyRedirect(city), 'utf8');
}
counts.legacyRedirect = legacyTargets.size;

// City URLs that redirect to another city (states listed as cities, "delhi" → New Delhi), in both
// URL shapes: /prayer-times/<country>/<city> and the old /prayer-times/<city>.
for (const [from, to] of Object.entries(seo.CITY_URL_REDIRECTS)) {
  const target = citiesBySlug.get(to);
  if (!target) throw new Error(`CITY_URL_REDIRECTS target ${to} is not in locations.json`);
  const [countrySlug, slug] = from.split('/');
  const redirect = buildLegacyRedirect(target);
  for (const file of [
    path.join(outDir, 'prayer-times', countrySlug, `${slug}.html`),
    ...(countries.has(slug) || legacyTargets.has(slug) ? [] : [path.join(outDir, 'prayer-times', `${slug}.html`)])
  ]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, redirect, 'utf8');
  }
  counts.cityRedirect = (counts.cityRedirect ?? 0) + 1;
}

// A single dua, a Learn step and a Learn quiz are shown on top of their parent page: same HTML and
// canonical as the parent, and src/.htaccess can 404 any /duas or /learn URL that has no file here.
const copyPage = (fromUrl, toUrl) => {
  const from = path.join(outDir, `${fromUrl.slice(1)}.html`);
  const to = path.join(outDir, `${toUrl.slice(1)}.html`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};
let detailCopies = 0;
for (const category of duaData.categories) {
  for (const dua of category.duas) { copyPage(seo.duaCategoryPath(category), `${seo.duaCategoryPath(category)}/${dua.id}`); detailCopies++; }
}
for (const topic of learnTopics.values()) {
  const topicPath = seo.learnTopicPath(topic);
  for (const entry of topic.entries) { copyPage(topicPath, `${topicPath}/${entry.id}`); detailCopies++; }
  if (topic.quizCount) { copyPage(topicPath, `${topicPath}/quiz`); detailCopies++; }
}
counts.detailCopies = detailCopies;

// Private routes (settings, login, profile, …) are served this shell instead of index.html by
// src/.htaccess, so they say noindex before any JavaScript runs.
fs.writeFileSync(path.join(distDir, 'noindex.html'), setMeta(template, 'name', 'robots', 'noindex, follow'), 'utf8');

console.log(`Prerendered ${total} pages and ${legacyTargets.size} old-URL redirects into ${path.relative(root, outDir)}: ${JSON.stringify(counts)}`);
