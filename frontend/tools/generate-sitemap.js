const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const locations = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/locations.json'), 'utf8'));
const siteUrl = 'https://salah-times.in';

const slugify = (value) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const cityUrls = [...new Set(locations.map(location => slugify(location.city)))]
  .sort()
  .map(slug => `  <url>\n    <loc>${siteUrl}/salahtime/${slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`);

const staticUrls = [
  ['/', 'daily', '1.0'],
  ['/salahtime', 'daily', '0.9'],
  ['/about', 'monthly', '0.8'],
  ['/privacy-policy', 'monthly', '0.6'],
  ['/ramzan', 'weekly', '0.7'],
  ['/tasbih', 'monthly', '0.7'],
  ['/duas', 'monthly', '0.7'],
  ['/qibla-direction', 'monthly', '0.7'],
  ['/salah-calendar', 'monthly', '0.7'],
  ['/zakat-calculator', 'monthly', '0.7']
].map(([url, changefreq, priority]) =>
  `  <url>\n    <loc>${siteUrl}${url}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
);

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...staticUrls,
  ...cityUrls,
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(path.join(root, 'src/sitemap.xml'), sitemap, 'utf8');
console.log(`Generated sitemap with ${staticUrls.length + cityUrls.length} URLs.`);
