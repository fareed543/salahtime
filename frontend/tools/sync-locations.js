// Brings src/assets/locations.json up to date with the latest location release from the back office
// (Locations > Release). The bundled file is the app's offline fallback and the source of the city
// pages in the sitemap / prerendered SEO pages, so it is refreshed before every build.
//
// If the API can't be reached or nothing has been released yet, the current file is kept: a build
// never fails or loses cities because of the network.
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

    fs.writeFileSync(target, JSON.stringify(items, null, 2) + '\n', 'utf8');
    console.log(`Locations: release v${latest.version} (${items.length} cities) written to src/assets/locations.json.`);
  } catch (error) {
    console.warn(`Locations: release unavailable from ${apiUrl} (${error.message}); keeping the bundled list.`);
  }
};

main();
