const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const environmentFiles = [
  path.join(projectRoot, 'src', 'environment', 'environment.ts'),
  path.join(projectRoot, 'src', 'environment', 'environment.prod.ts')
];

function getCurrentVersion(content) {
  const match = content.match(/appVersion:\s*'(\d+)\.(\d+)\.(\d+)'/);

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function updateEnvironmentFile(filePath, appVersion) {
  const original = fs.readFileSync(filePath, 'utf8');

  if (/appVersion:\s*'[^']*'/.test(original)) {
    const updated = original.replace(
      /appVersion:\s*'[^']*'/,
      `appVersion: '${appVersion}'`
    );

    fs.writeFileSync(filePath, updated, 'utf8');
    return;
  }

  const updated = original.replace(
    /appName:\s*'[^']*',/,
    `$&\n  appVersion: '${appVersion}',`
  );

  if (updated === original) {
    throw new Error(`Could not insert appVersion in ${filePath}`);
  }

  fs.writeFileSync(filePath, updated, 'utf8');
}

function main() {
  const primaryFile = environmentFiles[0];
  const primaryContent = fs.readFileSync(primaryFile, 'utf8');
  const currentVersion = getCurrentVersion(primaryContent) ?? { major: 1, minor: 0, patch: 0 };
  const nextVersion = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch + 1}`;

  environmentFiles.forEach((filePath) => updateEnvironmentFile(filePath, nextVersion));

  console.log(`APP_VERSION=${nextVersion}`);
}

main();
