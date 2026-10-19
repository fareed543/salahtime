// Fails the build when a language file is missing text that en.json has.
// ngx-translate silently falls back to English for missing keys, so a section added only to
// en.json (as happened with the Report an Issue screen) would otherwise ship untranslated.
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../src/assets/i18n');
const read = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) =>
  child && typeof child === 'object' ? flatten(child, `${prefix}${key}.`) : [`${prefix}${key}`]);

const reference = flatten(read('en.json'));
const problems = fs.readdirSync(dir)
  .filter(file => file.endsWith('.json') && file !== 'en.json')
  .map(file => {
    const keys = new Set(flatten(read(file)));
    return { file, missing: reference.filter(key => !keys.has(key)) };
  })
  .filter(result => result.missing.length);

if (problems.length) {
  problems.forEach(({ file, missing }) => {
    console.error(`${file}: ${missing.length} key(s) missing from en.json, e.g. ${missing.slice(0, 5).join(', ')}`);
  });
  console.error('Add the translations above (src/assets/i18n), or the app shows English for them.');
  process.exit(1);
}

console.log(`i18n: all ${reference.length} keys present in every language.`);
