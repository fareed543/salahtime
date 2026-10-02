# <ScreenID> — <Screen Name>

> Rules for every section: `Screen-Analysis-Method.md`. Delete this line when filled in.

| Field | Value |
|---|---|
| **Screen ID** | <SCR-nn / OVL-nn> |
| **Module** | <Prayer Times / Zikar / Duas / Community / Auth / …> |
| **Component** | `<repo-relative path to .component.ts>` |
| **Feature module** | `<repo-relative path to .module.ts>` |
| **Analysed on** | <yyyy-mm-dd> |
| **Verification** | Runtime (web) / Runtime (Android) / Code-reading only |
| **Overall health** | 🟢 Good / 🟡 Needs work / 🔴 Broken |

## Summary

<2–4 sentences: what the screen does, its health, top issues, recommended next action.>

## D1 — Purpose & Entry Points

<One paragraph: what the screen is for.>

| Route | Guard | Params / Query | Reached from |
|---|---|---|---|
| `<path>` | <`AuthGuard` / —> | <`:city` / —> | <menu, link, redirect, deep link> |

## D2 — UI Composition

| # | Section (render order) | Shared components | Notes |
|---|---|---|---|
| 1 | <header / list / card …> | <`app-screen-header` / —> | <—> |

### Dialogs

| Dialog | Opened by | Returns | Analysed in |
|---|---|---|---|
| <`ZikarNotificationDialogComponent`> | <handler `path:line`> | <result type / —> | <this report / `SCR-nn`> |

## D3 — User Actions

| Element | Handler | Outcome |
|---|---|---|
| <button / input> | `<method()>` (`path:line`) | <what the user sees / what is stored> |

## D4 — Data & State

| Source | Kind | Used for |
|---|---|---|
| `<ServiceName.method()>` | Service / API `<METHOD /endpoint>` / localStorage `<key>` / Observable | <purpose> |

**Subscriptions & teardown:** <how subscriptions are cleaned up, or `None.`>

## D5 — Native / Platform Behaviour

| Capability | Plugin | Web behaviour | Android behaviour | Permission |
|---|---|---|---|---|
| <Notifications> | `@capacitor/local-notifications` | <…> | <…> | <POST_NOTIFICATIONS / exact alarm> |

## D6 — States

| State | Handled? | Evidence |
|---|---|---|
| Loading | Yes / No | `path:line` |
| Empty | Yes / No | |
| Error | Yes / No | |
| Offline | Yes / No | |
| Permission denied | Yes / No / N/A | |

## D7 — i18n

<Hard-coded strings with evidence, missing keys, RTL issues — or `None.`>

## D8 — Performance

<Findings with evidence — or `None.`>

## D9 — Accessibility

<Findings with evidence — or `None.`>

## D10 — SEO

<`data.seo` values, canonical, sitemap — or `N/A — not a public route.`>

## D11 — Security & Privacy

<Findings with evidence — or `None.`>

## Findings

| ID | Severity | Dimension | Finding | Evidence | Impact | Recommendation | Status |
|---|---|---|---|---|---|---|---|
| <SCR-nn-F01> | <High> | <D5> | <one sentence> | `path:line` | <user impact> | <action> | Open / Fixed (`Feedbacks/…`) |

## Open Questions

1. <anything not provable from code yet>
