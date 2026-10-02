# FEEDBACK 2026-10-02 — Website logo, favicon and install icons broken

| Field | Value |
|---|---|
| **Screens** | Main layout header, startup screen, onboarding, browser tab, PWA install, iOS home screen, social previews |
| **Severity** | Medium |
| **Status** | Fixed in working tree — production build verified |

## Findings

| Problem | Evidence |
|---|---|
| `assets/images/logo.webp` deleted in the working tree, but still referenced → broken images | `layouts/main-layout/main-layout.component.html:17-18`, `app.component.html:3`, onboarding language + madhab steps |
| `assets/images/logo.png` held WebP data (the old `logo.webp` renamed over it); `manifest.json` declared it as a 512×512 PNG | file signature `RIFF…WEBP`, 500×500 |
| `src/favicon.ico` corrupt (first PNG byte replaced by UTF-8 `EF BF BD`) and not in the production `assets` list | `angular.json:28-35` |
| No maskable or apple-touch sizes | `manifest.json`, `index.html:14` |

## Fix

Source artwork: the flat mint-on-green logo, which was generated with Gemini and had an uneven light
border, a Gemini sparkle watermark (bottom right) and background noise. It was **rebuilt clean**: a
crisp `#195147` rounded square with the mint artwork extracted on top (border, watermark and 1 noise
speck removed). Master: `play-store-assets/brand/logo-clean-1024.png`.

`logo.webp` was removed on request; its 5 references (main layout ×2, startup, onboarding language
and madhab steps) now use `assets/images/logo.png`.

| File | Size | Use |
|---|---|---|
| `assets/images/logo.png` | 512 | Real PNG — header, startup, onboarding, og:image, login, loader, print |
| `assets/icons/icon-192.png`, `icon-512.png` | 192, 512 | Manifest `any` |
| `assets/icons/maskable-192.png`, `maskable-512.png` | 192, 512 | Manifest `maskable`, brand green `#195147` full bleed, artwork in safe zone |
| `assets/icons/apple-touch-icon.png` | 180 | iOS home screen, full bleed |
| `assets/icons/favicon-16.png`, `favicon-32.png` | 16, 32 | Browser tab |
| `src/favicon.ico` | 16/32/48 | Default `/favicon.ico`, now in the production assets list |

`index.html` and `manifest.json` now point to these files.

## Note

The committed (HEAD) `logo.png` was a different design — the 334 KB gradient Play Store artwork
(`play-store-assets/2026-08-15/app-icon-ai-v1-play-512.png`). Committing this change replaces it with the flat logo.

## Verification

- [x] `npx ng build --configuration=production` succeeds; all icons present in `dist/salahtime`.
- [ ] Browser tab shows the logo after a hard refresh (service worker may serve the old icon until it updates).
- [ ] Chrome "Install app" and iOS "Add to Home Screen" show the green square icon.
