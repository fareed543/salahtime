const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const gradlePropertiesPath = path.join(projectRoot, 'android', 'gradle.properties');

function main() {
  const content = fs.readFileSync(gradlePropertiesPath, 'utf8');
  const codeMatch = content.match(/^APP_VERSION_CODE=(\d+)$/m);

  if (!codeMatch) {
    throw new Error(`APP_VERSION_CODE not found in ${gradlePropertiesPath}`);
  }

  const nextCode = Number(codeMatch[1]) + 1;
  const nextName = `1.0.${nextCode}`;

  const updated = content
    .replace(/^APP_VERSION_CODE=\d+$/m, `APP_VERSION_CODE=${nextCode}`)
    .replace(/^APP_VERSION_NAME=.*$/m, `APP_VERSION_NAME=${nextName}`);

  fs.writeFileSync(gradlePropertiesPath, updated, 'utf8');

  console.log(`APP_VERSION_CODE=${nextCode}`);
  console.log(`APP_VERSION_NAME=${nextName}`);
}

main();
