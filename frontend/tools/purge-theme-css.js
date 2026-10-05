// Removes rules for theme/vendor components SalahTime never uses from src/assets/css/app.css.
// A rule is removed only when every selector in it needs a class from one of the unused
// families below, so it can never match anything the app renders.
//
//   node tools/purge-theme-css.js          check (runs on prebuild): fails if a purged family is used
//                                          again, or if app.css still has rules from these families
//   node tools/purge-theme-css.js --write  rewrite app.css without them
//
// The script re-checks the sources and refuses any family whose class names appear in src/app,
// src/styles or index.html, so adding a family here can never strip styles the app relies on.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'src/assets/css/app.css');

// Class-name prefixes of plugins and components the app does not include.
const UNUSED_FAMILIES = [
  'fr',              // Froala editor (not installed)
  'dataTables', 'dataTable', 'dt', 'dtr', 'dtfh', 'dtb', // DataTables
  'daterangepicker', 'drp',
  'swiper', 'sw', 'swipeunlock',
  'footable', 'fooicon',
  'fc',              // FullCalendar
  'dropzone', 'dz',
  'simplebar',
  'offcanvas', 'accordion', 'carousel', 'popover', 'tooltip', 'toast', 'bs', // Bootstrap JS components
  'pagination', 'breadcrumb',
  'chat', 'riskometer', 'rtlcheck', 'sunmoon', 'maxwidth',
  'range', 'range1', 'range2', 'range3' // demo sliders (.range3 also loaded a missing image and a third-party URL)
];

const collectSources = () => {
  const files = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(html|ts|scss|json)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, 'src/app'));
  walk(path.join(root, 'src/styles'));
  files.push(path.join(root, 'src/styles.scss'), path.join(root, 'src/index.html'), path.join(root, 'src/assets/menu-config.json'));
  return files.map(file => fs.readFileSync(file, 'utf8')).join('\n')
    // Locale tags like 'fr-FR' are not class names.
    .replace(/(["'`])[a-z]{2}-[A-Z]{2}\1/g, '');
};

const familyOf = className => className.split(/[-_]/)[0];
const familyUsedInSources = (family, sources) =>
  new RegExp(`(^|[\\s"'\`.{\\[])${family}[-_][a-zA-Z0-9]`, 'm').test(sources)
  || new RegExp(`class(?:Name)?=["'](?:[^"']*\\s)?${family}(?=[\\s"'])`).test(sources);

// Splits a block of CSS into top-level chunks: { prelude, body } for blocks, or raw text.
const splitBlocks = css => {
  const blocks = [];
  let depth = 0, start = 0, braceAt = -1;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '"' || ch === "'") { const end = css.indexOf(ch, i + 1); i = end < 0 ? css.length : end; continue; }
    if (ch === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i + 2); i = end < 0 ? css.length : end + 1; continue; }
    if (ch === '{') { if (depth === 0) braceAt = i; depth++; }
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        blocks.push({ prelude: css.slice(start, braceAt), body: css.slice(braceAt + 1, i) });
        start = i + 1;
      }
    }
  }
  if (start < css.length) blocks.push({ raw: css.slice(start) });
  return blocks;
};

const splitSelectors = prelude => {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < prelude.length; i++) {
    if (prelude[i] === '(') depth++;
    else if (prelude[i] === ')') depth--;
    else if (prelude[i] === ',' && depth === 0) { parts.push(prelude.slice(start, i)); start = i + 1; }
  }
  parts.push(prelude.slice(start));
  return parts;
};

const stripNot = selector => {
  let out = '', i = 0;
  while (i < selector.length) {
    if (selector.startsWith(':not(', i)) {
      let depth = 0, j = i + 4;
      for (; j < selector.length; j++) { if (selector[j] === '(') depth++; else if (selector[j] === ')' && --depth === 0) break; }
      i = j + 1;
    } else out += selector[i++];
  }
  return out;
};

const deadFamilies = new Set();
const selectorIsDead = selector => {
  const classes = stripNot(selector).match(/\.[a-zA-Z_][a-zA-Z0-9_-]*/g) || [];
  return classes.some(cls => deadFamilies.has(familyOf(cls.slice(1))));
};

let removedRules = 0;
const purge = css => splitBlocks(css).map(block => {
  if (block.raw !== undefined) return block.raw;
  const prelude = block.prelude.trim();
  if (/^@(media|supports|layer)/.test(prelude)) {
    const inner = purge(block.body);
    return inner.trim() ? `${block.prelude}{${inner}}` : '';
  }
  if (prelude.startsWith('@')) return `${block.prelude}{${block.body}}`;
  const selectors = splitSelectors(prelude);
  const alive = selectors.filter(selector => !selectorIsDead(selector));
  if (!alive.length) { removedRules++; return ''; }
  if (alive.length === selectors.length) return `${block.prelude}{${block.body}}`;
  return `\n${alive.map(s => s.trim()).join(',\n')} {${block.body}}`;
}).join('');

const sources = collectSources();
const refused = UNUSED_FAMILIES.filter(family => familyUsedInSources(family, sources));
UNUSED_FAMILIES.filter(family => !refused.includes(family)).forEach(family => deadFamilies.add(family));
if (refused.length) {
  // app.css has already been purged, so a family that is now used has no styles left.
  console.error(`These purged component families are now used in the app, but their CSS was removed from app.css: ${refused.join(', ')}`);
  console.error('Restore their rules from the theme (git history of src/assets/css/app.css) and remove them from UNUSED_FAMILIES.');
  process.exit(1);
}

const css = fs.readFileSync(cssPath, 'utf8');
const purged = purge(css).replace(/\n{3,}/g, '\n\n');
const kb = bytes => `${(bytes / 1024).toFixed(0)} KB`;
console.log(`app.css: ${kb(css.length)} -> ${kb(purged.length)} (${removedRules} rules from unused families)`);

if (process.argv.includes('--write')) {
  fs.writeFileSync(cssPath, purged, 'utf8');
  console.log('Wrote src/assets/css/app.css');
} else if (removedRules > 0) {
  process.exitCode = 1;
}
