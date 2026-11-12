// NF-015 Sunnah Shorts — build plug-in for tools/generate-sitemap.js and tools/prerender-seo.js.
//
// Everything the build does for Shorts is here, so the module stays removable: when this file or
// src/app/components/shorts is missing, both tools skip Shorts and build the rest of the site as before.
//
//   generate-sitemap.js: staticPage (/shorts) + sitemapEntries() -> sitemap-shorts.xml (one URL per card)
//   prerender-seo.js:    render(url, helpers) -> HTML for /shorts and /shorts/<slug>, or null for other URLs
//
// Cards come from the API (http-sunnah/list) and are cached in tools/.cache/sunnah-shorts.json; when the
// API can't be reached the cached copy is used, so a build never fails because of the network. A card
// published after a build gets its page in the next one (nightly deploy, CR-006).
const fs = require('fs');
const path = require('path');

module.exports = function shortsPages({ root, loadTs }) {
  if (!fs.existsSync(path.join(root, 'src/app/components/shorts/shorts-seo.ts'))) return null;

  const seo = loadTs('src/app/components/shorts/shorts-seo.ts');
  const cacheFile = path.join(root, 'tools/.cache/sunnah-shorts.json');
  const empty = { version: 1, categories: [], cards: [] };
  const readCache = () => (fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : empty);
  const writeCache = list => {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(list, null, 2), 'utf8');
  };

  const load = async apiUrl => {
    try {
      const response = await fetch(`${apiUrl}http-sunnah/list`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const list = await response.json();
      if (!list || list.version !== 1 || !Array.isArray(list.cards)) throw new Error('unexpected response');
      writeCache(list);
      return list;
    } catch (error) {
      if (fs.existsSync(cacheFile)) {
        console.warn(`Sunnah Shorts unavailable from ${apiUrl} (${error.message}); using the cached copy.`);
        return readCache();
      }
      console.warn(`Sunnah Shorts unavailable from ${apiUrl} (${error.message}) and no cached copy; no card pages this build.`);
      writeCache(empty);
      return empty;
    }
  };

  // ------------------------------------------------------------------ prerendered pages
  let shorts;
  let bySlug;
  let categories;
  const data = () => {
    if (!shorts) {
      shorts = readCache();
      bySlug = new Map(shorts.cards.map(card => [card.slug, card]));
      categories = new Map(shorts.categories.map(category => [category.id, category]));
    }
    return shorts;
  };
  const en = value => (value && (value.en || '')) || '';

  const hub = ({ routeSeo, link, escapeHtml, renderPage }) => {
    const route = routeSeo.get(seo.SHORTS_PATH);
    if (!route) throw new Error(`No data.seo with canonicalPath '${seo.SHORTS_PATH}'`);
    const body = [
      `<nav aria-label="Breadcrumb">${link('/', 'Home')}</nav>`,
      `<h1>${escapeHtml('Sunnah Shorts: daily Sunnahs of the Prophet ﷺ')}</h1><p>${escapeHtml(seo.SHORTS_INTRO)}</p>`,
      ...seo.SHORTS_ABOUT.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`),
      ...shorts.categories.map(category => {
        const cards = shorts.cards.filter(card => card.categoryId === category.id);
        return cards.length ? [
          `<section><h2>${escapeHtml(en(category.name))}</h2><ul>`,
          ...cards.map(card => `<li>${link(seo.sunnahCardPath(card), seo.sunnahPlain(en(card.headline)))}`
            + ` — ${escapeHtml(en(card.body))}${card.references.length ? ` (${escapeHtml(seo.sunnahReferences(card))})` : ''}</li>`),
          `</ul></section>`
        ].join('') : '';
      })
    ].join('');
    return renderPage({ ...route, url: `${seo.SHORTS_SITE_URL}${seo.SHORTS_PATH}`, body });
  };

  const cardPage = (card, { link, linkList, escapeHtml, renderPage, jsonLdId = 'sunnah-card-schema' }) => {
    const category = categories.get(card.categoryId);
    const meta = seo.sunnahCardMeta(card, category);
    const others = shorts.cards.filter(other => other !== card && other.categoryId === card.categoryId).slice(0, 8);
    const zikr = card.zikr;
    const body = [
      `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link(seo.SHORTS_PATH, 'Sunnah Shorts')}${category ? ` › ${escapeHtml(en(category.name))}` : ''}</nav>`,
      `<h1>${escapeHtml(meta.heading)}</h1>`,
      `<p>${escapeHtml(en(card.body))}</p>`,
      zikr && zikr.arabic ? `<p lang="ar" dir="rtl">${escapeHtml(zikr.arabic)}</p>` : '',
      zikr && zikr.transliteration ? `<p><em>${escapeHtml(zikr.transliteration)}</em></p>` : '',
      zikr && en(zikr.meaning) ? `<p>${escapeHtml(en(zikr.meaning))}</p>` : '',
      card.references.length ? `<p>Reference: ${escapeHtml(seo.sunnahReferences(card))}</p>` : '',
      others.length && category
        ? `<section><h2>More ${escapeHtml(en(category.name))} Sunnahs</h2>${linkList(others.map(other => link(seo.sunnahCardPath(other), seo.sunnahPlain(en(other.headline)))))}</section>`
        : '',
      `<p>${link(seo.SHORTS_PATH, 'All Sunnah Shorts')}</p>`
    ].join('');
    return renderPage({ ...meta, schemas: [[jsonLdId, seo.sunnahCardSchema(card, category)]], body });
  };

  return {
    /** Entry for generate-sitemap.js's static page list. */
    staticPage: [seo.SHORTS_PATH, 'weekly', '0.7', ['src/app/components/shorts']],

    /** Fetches (or reuses) the card list and returns one sitemap entry per card. */
    async sitemapEntries({ apiUrl, urlEntry, today }) {
      const list = await load(apiUrl);
      return list.cards.map(card => urlEntry(seo.sunnahCardPath(card), today, 'weekly', '0.6'));
    },

    /** HTML for a Shorts URL, or null when the URL is not a Shorts page. */
    render(url, helpers) {
      if (url === seo.SHORTS_PATH) { data(); return hub(helpers); }
      const parts = url.split('/').filter(Boolean);
      if (parts[0] !== 'shorts' || parts.length !== 2) return null;
      data();
      const card = bySlug.get(parts[1]);
      if (!card) throw new Error(`Sitemap Sunnah card ${url} is not in ${path.relative(root, cacheFile)}`);
      return cardPage(card, helpers);
    }
  };
};
