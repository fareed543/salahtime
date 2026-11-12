# Sunnah Shorts (NF-015)

One Sunnah of the Prophet ﷺ per card. `/shorts` shows a grid of thumbnails grouped by category;
tapping one opens `/shorts/<slug>`, a full-screen player that moves one card per swipe (or arrow
key / side button). Like, save, "done today" and share. No login. Cards are written in the back
office (Sunnah Shorts) and served by `http-sunnah/list`.

Design: `WorkStation/Product/Change Requests/NF-015_sunnah-shorts/NF-015.md`.

## Files

| File | What |
|---|---|
| `shorts.module.ts` | Lazy module, routes, loads `sunnah.css` |
| `sunnah-grid/` | `/shorts` grid + category filter |
| `sunnah-player/` | `/shorts/<slug>` player (scroll-snap, URL follows the card with `replaceUrl`) |
| `sunnah-card/` | One card, `tile` or `full`; templates `t01`–`t10` or photo style |
| `sunnah-shorts.service.ts` | API list (cached offline), likes, saves, done-today, share |
| `shorts.model.ts` | API shape |
| `shorts-seo.ts` | Page titles / schema; also used by the build (`tools/shorts-pages.js`). No imports on purpose |
| `shorts.styles.scss` | Card templates, grid and player; separate bundle `sunnah.css` |

Device storage keys: `sunnah-shorts-cache`, `-saved`, `-done`, `-liked`, `-device-id`.

## Independent module

Nothing outside this module imports from it. It only *registers* itself in the places below.
To remove Shorts, delete this folder and undo these lines — the rest of the app builds and runs as before.

**App (`frontend/`)**
- `src/app/app-routing.module.ts` — the `shorts` route and the three `learn` redirects
- `src/app/config/menu.config.ts`, `src/assets/menu-config.json` — the `shorts` menu item
- `src/app/components/dashboard/dashboard.component.ts` — the `MENU.SHORTS` tile
- `src/app/seo/seo-content.ts` — the `/shorts` row in `HOME_TOOL_LINKS`
- `angular.json` — style bundle `sunnah` and asset `src/sitemap-shorts.xml`
- `src/.htaccess` — `^learn` 301 and `^shorts` rule (`tools/check-spa-routes.js`: `learn` in `redirected`)
- `tools/shorts-pages.js` — build plug-in; `generate-sitemap.js` / `prerender-seo.js` skip Shorts when it is missing
- `src/assets/i18n/*.json` — `SHORTS` and `MENU.SHORTS` (unused keys are harmless)

**Back office (`backoffice/`)** — folder `src/app/sunnah-shorts/`, its route in `app-routing.module.ts`,
its entry in `src/assets/data/menu.json`, style bundle `sunnah-preview` in `angular.json`.

**API (`api/`)** — `controllers/HttpSunnahController.php`, `controllers/AdminSunnahController.php`,
`components/SunnahShorts.php`, `models/Sunnah*.php`, migration `m261112_100000_nf015_sunnah_shorts.php`
(tables `bt_sunnah_*`), uploaded photos in `web/sunnah-images/`. No shared API code is changed.
