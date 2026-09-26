const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const assets = path.resolve(__dirname, '../src/assets');
const read = file => JSON.parse(fs.readFileSync(path.join(assets, file), 'utf8'));
const data = read('data/learn.json');
const languages = ['en', 'te', 'ar', 'ur'];
const rulingNames = ['farz', 'wajib', 'sunnah', 'mustahabb', 'nafl'];
const text = value => languages.forEach(lang => assert.equal(typeof value?.[lang], 'string', `Missing ${lang} content`));
const unique = values => assert.equal(new Set(values).size, values.length, 'Duplicate ID');
assert.equal(data.version, 1);
unique(data.topics.map(topic => topic.id));
for (const topic of data.topics) {
  text(topic.title); text(topic.summary);
  unique(topic.entries.map(entry => entry.id));
  unique(topic.sequence);
  const find = id => topic.entries.find(entry => entry.id === id);
  topic.sequence.forEach(id => assert.equal(find(id)?.kind, 'action', `Invalid sequence ID: ${id}`));
  for (const entry of topic.entries) {
    text(entry.title); text(entry.summary);
    assert.ok(entry.steps.length, `No explanation: ${entry.id}`);
    entry.steps.forEach(text);
    if (entry.note) text(entry.note);
    if (entry.missed) text(entry.missed);
    if (entry.kind === 'action') assert.ok(rulingNames.includes(entry.ruling));
    if (entry.image) assert.ok(fs.existsSync(path.resolve(assets, '..', entry.image)), `Missing image: ${entry.image}`);
    (entry.related ?? []).forEach(id => assert.ok(find(id), `Broken related link: ${id}`));
    assert.ok(entry.references.length, `Missing reference: ${entry.id}`);
    entry.references.forEach(reference => assert.equal(new URL(reference.url).protocol, 'https:'));
  }
  unique(topic.quiz.map(question => question.id));
  for (const question of topic.quiz) {
    text(question.question); text(question.explanation); question.options.forEach(text);
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length);
    assert.ok(find(question.entryId), 'Broken quiz explanation link');
  }
}
assert.equal(data.topics.find(t => t.id === 'wudu').entries.filter(e => e.ruling === 'farz').length, 4);
const english = read('i18n/en.json').LEARN;
for (const lang of ['en','te','ta','ar','ur','fr','tr','id','ms','es']) {
  const translated = read(`i18n/${lang}.json`);
  assert.ok(translated.MENU.LEARN);
  Object.keys(english).filter(key => key !== 'RULINGS').forEach(key => {
    assert.equal(typeof translated.LEARN[key], 'string', `${lang}: ${key}`);
    assert.deepEqual(translated.LEARN[key].match(/\{\{\w+\}\}/g)?.sort(), english[key].match(/\{\{\w+\}\}/g)?.sort(), `Interpolation mismatch: ${lang}/${key}`);
  });
  rulingNames.forEach(ruling => assert.ok(translated.LEARN.RULINGS[ruling]));
}
const menu = read('menu-config.json').sidebarMenu.filter(item => item.route === '/learn');
assert.equal(menu.length, 1); assert.equal(menu[0].enabled, true);
console.log(`PASS: ${data.topics.length} topics, lesson links/sequences, images, four content languages, ten UI languages, quiz answers and menu configuration.`);
