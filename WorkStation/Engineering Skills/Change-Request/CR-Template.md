# <CR-nnn / NF-nnn> — <Title>

> Rules: `CR-Method.md`. Delete this line when filled in.

| Field | Value |
|---|---|
| **Type** | Change Request / New Feature |
| **Size** | S / M / L |
| **Module(s)** | <Zikar, Prayer Times, …> |
| **Requested by / on** | <name> · <yyyy-mm-dd> |
| **Status** | Draft → Design approved → In build → Verified → Closed |
| **Code branch** | <branch> |

## 1. Request

<The request in the requester's own words.>

## 2. Goal & Acceptance Criteria

**Goal:** <one sentence>

| # | Given / When / Then | Platform |
|---|---|---|
| AC-1 | <Given …, when …, then …> | Web + Android |

**Out of scope:** <explicit list, or `None.`>

## 3. Impact Analysis

| Area | Item | Change | Evidence |
|---|---|---|---|
| Screen | <SCR-nn Name> | New / Modify / None | `path:line` |
| Dialog | <DLG-nn> | | |
| Service | <ServiceName> | | |
| API | <`http-x/action`> | | |
| DB | <table.column> | | |
| Native | <channel / plugin / raw asset> | | |
| i18n | <keys> | | `frontend/src/assets/i18n/*.json` |
| SEO / Route | <route> | | |
| Back office | <screen> | | |

**Hidden ripple checklist:** ☐ i18n (13 files) ☐ SEO + sitemap ☐ localStorage migration ☐ notification channel version ☐ `keep.xml` ☐ back office ☐ API auth/CORS ☐ app version

## 4. Design Delta

**FDS:** <rules added / changed / removed, with new rule IDs — or `None.`>
**HLD:** <hats touched and what changes — or `None.`>
**LLD:** <links to LLDs in this folder — or `None.`>

## 5. Implementation Plan

| # | Task | File(s) | Done |
|---|---|---|---|
| 1 | <task> | `<path>` | ☐ |

## 6. Verification

| Check | Web | Android | Result |
|---|---|---|---|
| AC-1 | ☐ | ☐ | <pass / fail + note> |
| `ng build --configuration=production` | ☐ | — | |
| Unit tests (`ng test`) | ☐ | — | |
| Release APK built (`build-apk.bat`) | — | ☐ | |

## 7. Doc Ripple

☐ Module FDS ☐ Module HLD ☐ Screen report(s) ☐ SCREEN_INVENTORY ☐ SOCK ☐ `Product/CURRENT_STATUS.md` ☐ VERSION / Release Notes

## Open Questions / Follow-ups

1. <…>
