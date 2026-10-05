// Fails the build when an Angular route would get a 404 from Apache.
// src/.htaccess only serves index.html for known routes (so unknown URLs return a real 404),
// so every route and every sitemap URL must match one of its index.html rules.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const spaRules = [...read('src/.htaccess').matchAll(/^RewriteRule\s+(\S+)\s+index\.html\b/gm)]
  .map(match => new RegExp(match[1]));
const servedBySpa = (url) => {
  const relative = url.replace(/^\//, '');
  return relative === '' || spaRules.some(rule => rule.test(relative));
};

const routePaths = (source) => [...source.matchAll(/path:\s*'([^']*)'/g)].map(match => match[1]);

// Top-level routes, expanding lazy-loaded modules into their child routes.
const appRouting = read('src/app/app-routing.module.ts');
const lazyRoute = /path:\s*'([^']*)',[^{}]*?loadChildren:\s*\(\)\s*=>\s*import\('([^']+)'\)/g;
const lazyParents = new Set();
const urls = [];
for (const [, parent, modulePath] of appRouting.matchAll(lazyRoute)) {
  lazyParents.add(parent);
  const moduleFile = path.join('src/app', `${modulePath}.ts`);
  for (const child of routePaths(read(moduleFile))) {
    urls.push([parent, child].filter(Boolean).join('/'));
  }
}
for (const route of routePaths(appRouting)) {
  if (!lazyParents.has(route)) {
    urls.push(route);
  }
}

const sitemapUrls = fs.readdirSync(path.join(root, 'src'))
  .filter(file => /^sitemap-.+\.xml$/.test(file))
  .flatMap(file => [...read(`src/${file}`).matchAll(/<url>\s*<loc>https:\/\/salah-times\.in([^<]*)<\/loc>/g)])
  .map(match => match[1]);

// Old paths are 301-redirected before the SPA rules, so they never need index.html.
const redirected = (url) => /^all-prayer-times(\/|$)/.test(url);
const routeUrls = [...new Set(urls)]
  .filter(url => !redirected(url))
  .map(url => `/${url.replace(/:[^/]+/g, 'sample-id')}`.replace(/\/$/, '') || '/');

const missing = [...routeUrls, ...sitemapUrls].filter(url => !servedBySpa(url));
if (servedBySpa('/this-page-does-not-exist')) {
  missing.push('(unknown URLs are served by index.html, so they would never 404)');
}

if (missing.length) {
  console.error('These URLs would return 404 from src/.htaccess. Add them to its index.html rules:');
  [...new Set(missing)].forEach(url => console.error(`  ${url}`));
  process.exit(1);
}
console.log(`SPA routes OK: ${routeUrls.length} route patterns and ${sitemapUrls.length} sitemap URLs are served by index.html.`);
