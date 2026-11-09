// Brings src/assets/locations.json up to date with the latest location release from the back office
// (Locations > Release). The bundled file is the app's offline fallback and the source of the city
// pages in the sitemap / prerendered SEO pages, so it is refreshed before every build.
//
// If the API can't be reached or nothing has been released yet, the current file is kept: a build
// never fails or loses cities because of the network. The release has no states; each city keeps the
// state it has in the current file (the website's city pages use it).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const target = path.join(root, 'src/assets/locations.json');
const apiUrl = process.env.LOCATIONS_API_URL
  || (fs.readFileSync(path.join(root, 'src/environments/environment.prod.ts'), 'utf8').match(/apiUrl:\s*'([^']+)'/) || [])[1];

const main = async () => {
  try {
    const latestResponse = await fetch(`${apiUrl}http-location/latest-release`, { signal: AbortSignal.timeout(20000) });
    if (!latestResponse.ok) throw new Error(`HTTP ${latestResponse.status}`);
    const latest = await latestResponse.json();
    if (!latest?.version || !latest.url) {
      console.log('Locations: nothing released from the back office yet; keeping the bundled list.');
      return;
    }

    const fileResponse = await fetch(latest.url, { signal: AbortSignal.timeout(30000) });
    if (!fileResponse.ok) throw new Error(`HTTP ${fileResponse.status} for ${latest.url}`);
    const text = await fileResponse.text();
    if (latest.checksum && crypto.createHash('sha256').update(text).digest('hex') !== latest.checksum) {
      throw new Error('checksum mismatch');
    }
    const items = JSON.parse(text);
    if (!Array.isArray(items) || !items.length || !items.every(item => item?.city && item?.country && item?.coordinates)) {
      throw new Error('unexpected file content');
    }

    // Locations are country -> city in the back office (no states: m261011_100000_remove_states_from_locations),
    // but the city pages say "Chennai, Tamil Nadu". Keep each city's state from the current bundled list.
    const slug = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const key = item => `${item.countrySlug || slug(item.country)}/${item.slug || slug(item.city)}`;
    const current = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : [];
    const states = new Map(current.filter(item => item.state).map(item => [key(item), item.state]));
    for (const item of items) {
      if (!item.state && states.has(key(item))) item.state = states.get(key(item));
    }
    const withoutState = items.filter(item => !item.state && item.country === 'India').map(item => item.city);
    if (withoutState.length) {
      console.warn(`Locations: ${withoutState.length} Indian cities have no state (add it to src/assets/locations.json): ${withoutState.join(', ')}`);
    }

    fs.writeFileSync(target, JSON.stringify(items, null, 2) + '\n', 'utf8');
    console.log(`Locations: release v${latest.version} (${items.length} cities) written to src/assets/locations.json.`);
  } catch (error) {
    console.warn(`Locations: release unavailable from ${apiUrl} (${error.message}); keeping the bundled list.`);
  }
};

main();
