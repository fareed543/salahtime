// Writes a static HTML file for every URL in the sitemap, so crawlers that don't run JavaScript
// (Bing, social previews, AI crawlers) get each page's own title, description, canonical,
// structured data and main text. src/.htaccess serves dist/prerendered/<path>.html when it exists.
//
// Each file is the built index.html with page-specific <head> tags and a static content block
// inside <app-root>; Angular replaces that block when it starts, so users get the normal app.
// The text comes from src/app/seo/seo-content.ts, the same module the app renders at runtime.
//
// Runs after `npm run build` / `npm run build:prod` (postbuild). Usage: node tools/prerender-seo.js [distDir]
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const distDir = path.resolve(root, process.argv[2] || 'dist/salahtime');
const outDir = path.join(distDir, 'prerendered');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// Load the shared TypeScript content module.
const loadTs = file => {
  const { outputText } = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const module = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(module.exports, require, module);
  return module.exports;
};
const seo = loadTs('src/app/seo/seo-content.ts');
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

const locations = JSON.parse(read('src/assets/locations.json'));
const citiesBySlug = new Map();
const countries = new Map();
for (const location of locations) {
  const key = `${seo.citySlug(location.country ?? '')}/${seo.citySlug(location.city)}`;
  if (!citiesBySlug.has(key)) citiesBySlug.set(key, location);
  if (location.country) countries.set(seo.citySlug(location.country), location.country);
}
const citiesIn = (country) => [...citiesBySlug.values()].filter(city => city.country === country);

// ---------------------------------------------------------------- html helpers

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (href, text) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
const cityHref = city => seo.cityRoute(city).join('/');
const cityLabel = city => (city.state ? `${city.city}, ${city.state}` : city.city);
const linkList = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const faqHtml = (items, headingTag = 'h3') =>
  items.map(item => `<${headingTag}>${escapeHtml(item.question)}</${headingTag}><p>${escapeHtml(item.answer)}</p>`).join('');
const jsonLd = (id, data) =>
  `<script type="application/ld+json"${id ? ` id="${id}"` : ''}>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
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

const renderPage = ({ title, description, url, schemas = [], body }) => {
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'name', 'robots', 'index, follow');
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  const pageTags = [
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    ...schemas.map(([id, data]) => jsonLd(id, data))
  ];
  html = html.replace('</head>', `${pageTags.join('')}</head>`);
  return html.replace('<app-root></app-root>', `<app-root><main class="container py-4 seo-prerender">${body}</main></app-root>`);
};

// ---------------------------------------------------------------- page builders

const cityContentSection = city => [
  `<section><h2>${escapeHtml(seo.cityIntroTitle(city))}</h2><p>${escapeHtml(seo.cityIntroDescription(city))}</p>`,
  `<h3>${escapeHtml(seo.cityFocusHeading(city))}</h3>`,
  seo.cityFocusItems(city).map(item => `<h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.body)}</p>`).join(''),
  `<h3>Prayer Times FAQ</h3>${faqHtml(seo.cityFaqItems(city), 'h4')}</section>`
].join('');

const buildCity = city => {
  const meta = seo.cityPageMeta(city);
  const countrySlug = seo.citySlug(city.country ?? '');
  const sameState = citiesIn(city.country).filter(other => other !== city && other.state && other.state === city.state);
  const nearby = (sameState.length ? sameState : citiesIn(city.country).filter(other => other !== city)).slice(0, 24);
  const body = [
    `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link('/prayer-times', 'Prayer Times')} › ${link(`/prayer-times/${countrySlug}`, city.country)}</nav>`,
    `<h1>${escapeHtml(translate(en.SALAHTIME.SEO_TITLE_CITY, { city: city.city, country: city.country }))}</h1>`,
    `<p>${escapeHtml(translate(en.SALAHTIME.SEO_DESC_CITY, { city: city.city, state: city.state }))}</p>`,
    cityContentSection(city),
    `<section><h2>Prayer times in more cities${sameState.length ? ` of ${escapeHtml(city.state)}` : ''}</h2>`,
    linkList(nearby.map(other => link(cityHref(other), cityLabel(other)))),
    `<p>${link(`/prayer-times/${countrySlug}`, `All cities in ${city.country}`)}</p></section>`
  ].join('');
  return renderPage({ ...meta, schemas: [['city-prayer-times-schema', seo.cityPageSchema(city)]], body });
};

const buildPrayerTimesIndex = () => {
  const meta = seo.cityPageMeta(null);
  const body = [
    `<h1>${escapeHtml(en.SALAHTIME.SEO_TITLE_DEFAULT)}</h1><p>${escapeHtml(en.SALAHTIME.SEO_DESC_DEFAULT)}</p>`,
    cityContentSection(null),
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
    `</section><section><h2>Prayer times in popular cities</h2>`,
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

// ---------------------------------------------------------------- write

fs.rmSync(outDir, { recursive: true, force: true });
const counts = { home: 0, index: 0, country: 0, city: 0, static: 0 };
for (const url of sitemapUrls) {
  const parts = url.split('/').filter(Boolean);
  let html;
  if (url === '/') { html = buildHome(); counts.home++; }
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
console.log(`Prerendered ${total} pages into ${path.relative(root, outDir)}: ${JSON.stringify(counts)}`);
