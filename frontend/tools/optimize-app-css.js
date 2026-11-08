// Shrinks the built theme stylesheet (dist/.../assets/css/app.css) to the rules SalahTime can use,
// then minifies it (PERF-05). The source file src/assets/css/app.css is not changed, so a class that
// new code starts using keeps its styles automatically on the next build.
//
// A rule is dropped only when every one of its selectors needs a class name that appears nowhere in
// the sources (src/app, src/index.html, src/styles, src/assets/**/*.json, tools/prerender-seo.js)
// and matches none of the safe prefixes: class names built at runtime ('theme-' + name, `lang-${code}`,
// detected automatically) and those added by libraries (Angular Material/CDK, SweetAlert2, Angular).
// Element, attribute and :root rules, @font-face and used @keyframes are always kept.
//
// Runs on postbuild, before tools/prerender-seo.js. Usage: node tools/optimize-app-css.js [distDir]
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const distDir = path.resolve(root, process.argv[2] || 'dist/salahtime');
const cssFile = path.join(distDir, 'assets/css/app.css');

const LIBRARY_PREFIXES = ['mat-', 'mdc-', 'cdk-', 'swal2-', 'ng-'];

// ---------------------------------------------------------------- what the app uses

const sourceFiles = () => {
  const files = [];
  const walk = (dir, pattern) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, pattern);
      else if (pattern.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(root, 'src/app'), /\.(html|ts|scss)$/);
  walk(path.join(root, 'src/styles'), /\.(scss|css)$/);
  walk(path.join(root, 'src/assets'), /\.json$/);
  files.push(
    path.join(root, 'src/index.html'),
    path.join(root, 'src/styles.scss'),
    path.join(root, 'src/404.html'),
    path.join(root, 'tools/prerender-seo.js')
  );
  return files.filter(file => fs.existsSync(file) && !/\.spec\.ts$/.test(file));
};

const sources = sourceFiles().map(file => fs.readFileSync(file, 'utf8')).join('\n');
const usedTokens = new Set(sources.match(/[A-Za-z0-9_-]+/g));
// Class names put together at runtime: 'theme-' + name, `lang-${code}`, class="swatch-{{ x }}".
const builtPrefixes = new Set([
  ...[...sources.matchAll(/['"`]([a-z][a-z0-9-]*-)['"`]\s*\+/g)].map(m => m[1]),
  ...[...sources.matchAll(/`([a-z][a-z0-9-]*-)\$\{/g)].map(m => m[1]),
  ...[...sources.matchAll(/class="[^"]*?([a-z][a-z0-9-]*-)\{\{/g)].map(m => m[1])
]);
const prefixes = [...LIBRARY_PREFIXES, ...builtPrefixes];

const classUsed = name => usedTokens.has(name) || prefixes.some(prefix => name.startsWith(prefix));

const selectorUsed = selector => {
  // Functional pseudo-classes whose classes may be absent on purpose: keep the selector.
  if (/:(is|where|has)\(/.test(selector)) return true;
  // :not(.x) matches more when .x is never used, so its classes are not required.
  const required = selector.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '');
  const classes = [...required.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map(m => m[1]);
  return classes.every(classUsed);
};

// ---------------------------------------------------------------- purge + minify

const run = async () => {
  if (!fs.existsSync(cssFile)) throw new Error(`${path.relative(root, cssFile)} not found; run after the build`);
  const original = fs.readFileSync(cssFile, 'utf8');
  const ast = postcss.parse(original);
  let removedRules = 0;

  ast.walkRules(rule => {
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    const kept = rule.selectors.filter(selectorUsed);
    if (!kept.length) { rule.remove(); removedRules++; }
    else if (kept.length !== rule.selectors.length) rule.selectors = kept;
  });

  // @keyframes no remaining rule and no source refers to.
  const animationText = [];
  ast.walkDecls(/^(animation|animation-name|-webkit-animation|-webkit-animation-name)$/i, decl => animationText.push(decl.value));
  const animationTokens = new Set(animationText.join(' ').match(/[A-Za-z0-9_-]+/g) || []);
  ast.walkAtRules(/keyframes$/i, atRule => {
    const name = atRule.params.trim();
    if (!animationTokens.has(name) && !usedTokens.has(name)) atRule.remove();
  });

  // At-rules (e.g. @media) left with nothing inside.
  let changed = true;
  while (changed) {
    changed = false;
    ast.walkAtRules(atRule => {
      if (atRule.nodes && atRule.nodes.length === 0) { atRule.remove(); changed = true; }
    });
  }

  const { code } = await esbuild.transform(ast.toString(), { loader: 'css', minify: true, logLevel: 'error' });
  fs.writeFileSync(cssFile, code, 'utf8');
  const kb = bytes => `${(bytes / 1024).toFixed(0)} KB`;
  console.log(`app.css: ${kb(original.length)} -> ${kb(code.length)} (${removedRules} unused rules removed; safe prefixes: ${prefixes.join(' ')})`);
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
