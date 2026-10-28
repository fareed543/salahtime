# Current Status — SalahTime Workstation

**Last updated:** 2026-10-02 · **Workstation version:** 1.1.0 · **Code branch:** `feature-dev/1.0.54`

## Where we are

- Workstation v1.1.0: all Engineering Skills written for both tracks
  (Reverse Engineering + Change Requests) — index `Engineering Skills/README.md`.
- RE-0 Inventory done for the frontend: `Product/Screens/SCREEN_INVENTORY.md`
  (26 routed + 2 overlay screens, 6 dialogs).
- **No screen reports or module baselines yet.** No CRs opened.

## Module documents (Claude Docs)

Module-by-module as-built docs are published as Claude Docs (decided 2026-10-02):

| Module | Doc | Status |
|---|---|---|
| Prayer Times | https://claude.ai/code/artifact/4d787664-9eda-4be3-91cc-d7423b9964d1 | Draft — 28 findings, awaiting review |

## Next (Track 1 — Reverse Engineering)

1. Pilot module **Zikar** end to end (RE-1 SCR-07 → RE-2 SOCK → RE-3 FDS →
   RE-4 HLD → RE-5 `S-NotificationService` LLD) to prove the templates;
   adjust templates from what the pilot shows.
2. Then remaining modules in this order: Prayer Times → Settings & Reminders →
   Onboarding → Qibla → Community → Duas → Ramadan → Learn → Auth.
3. RE-0 for back office (routes) and API (controller → action list).

## Track 2 — Change Requests

Ready to use now via `Engineering Skills/Change-Request/CR-Method.md`. A CR on
a module that is not yet baselined starts with a focused RE-1 of the affected
screens.

- **CR-002** (2026-10-26) — masjid display board: waqt start/end, nafil and
  makruh windows, azan + jamat countdowns, beep, owner-set colours. Design
  approved 2026-10-27; built and partly verified on web (board, colours,
  no-pin, phone, unit tests, both builds). Pending: run
  `database/2026-10-27_masjid_display_colors.sql`, check the owner colour form
  with the API, hear the beep live, Android APK —
  `Change Requests/CR-002_masjid-display-board-upgrade/CR-002.md`.
- **NF-003** (2026-10-27) — Blog: any logged-in user writes articles (SEO
  fields, live SEO score), editors approve / reject with reason / propose
  changes the author accepts; every save is a version with a full timeline;
  views, author pages, sitemap + prerender. Built and verified locally (API,
  web, back office). Pending: run `database/2026-10-27_blog_module.sql` on
  dev/prod, deploy API before the frontend build (prerender reads
  `http-blog/sitemap-list`), Android APK, FCM push check —
  `Change Requests/NF-003_blog-module/NF-003.md`.

## Open items

1. **Private keys tracked in git** — `salah-time.pem`,
   `aws/LightsailDefaultKey-ap-south-1.pem`, `frontend/my-release-key.keystore`,
   `backoffice/one-portal-key.keystore`. Owner: user. Remove from tracking, add
   to `.gitignore`, rotate server keys; back up the release keystore safely.
2. `/users/:id` has no `AuthGuard` — confirm whether intended (SCR-20).
3. Zikar sound fix applied on the working tree but **not yet verified on a
   device** — see `Feedbacks/FEEDBACK_2026-10-02_zikar-sound-stripped-by-shrinker.md`.
