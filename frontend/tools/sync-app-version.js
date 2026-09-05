const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const gradlePropertiesPath = path.join(projectRoot, 'android', 'gradle.properties');
const environmentFiles = [
  path.join(projectRoot, 'src', 'environments', 'environment.ts'),
  path.join(projectRoot, 'src', 'environments', 'environment.dev.ts'),
  path.join(projectRoot, 'src', 'environments', 'environment.prod.ts')
];

function readAppVersion() {
  const content = fs.readFileSync(gradlePropertiesPath, 'utf8');
  const match = content.match(/^APP_VERSION_NAME=(.+)$/m);

  if (!match) {
    throw new Error(`APP_VERSION_NAME not found in ${gradlePropertiesPath}`);
  }

  return match[1].trim();
}

function updateEnvironmentFile(filePath, appVersion) {
  const original = fs.readFileSync(filePath, 'utf8');
  let replaced = false;
  const updated = original.replace(/^(\s*appVersion:\s*)'[^']*'/m, (_, prefix) => {
    replaced = true;
    return `${prefix}'${appVersion}'`;
  });

  if (!replaced) {
    throw new Error(`appVersion entry not found in ${filePath}`);
  }

  if (updated === original) {
    console.log(`Already current ${path.relative(projectRoot, filePath)} -> ${appVersion}`);
    return;
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Updated ${path.relative(projectRoot, filePath)} -> ${appVersion}`);
}

function main() {
  const appVersion = readAppVersion();
  console.log(`Using app version ${appVersion}`);
  environmentFiles.forEach((filePath) => updateEnvironmentFile(filePath, appVersion));
}

main();
