const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor',
  'local-notifications',
  'android',
  'src',
  'main',
  'java',
  'com',
  'capacitorjs',
  'plugins',
  'localnotifications',
  'NotificationChannelManager.java'
);

if (!fs.existsSync(filePath)) {
  console.warn('[patch-local-notifications] NotificationChannelManager.java not found; skipping patch.');
  process.exit(0);
}

const source = fs.readFileSync(filePath, 'utf8');
const patched = source.replace(
  '.setUsage(AudioAttributes.USAGE_NOTIFICATION)',
  '.setUsage(AudioAttributes.USAGE_ALARM)'
);

if (patched !== source) {
  fs.writeFileSync(filePath, patched);
  console.log('[patch-local-notifications] Custom notification channels now use alarm audio.');
} else {
  console.log('[patch-local-notifications] Alarm audio patch already applied.');
}
