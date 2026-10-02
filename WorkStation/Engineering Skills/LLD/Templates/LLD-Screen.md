# LLD — U-<ScreenName> (Angular Screen)

> For **new or changed** screens in a CR/NF. Existing screens are documented
> by their screen report (`Product/Screens/`) — do not duplicate.

| Field | Value |
|---|---|
| **CR / NF** | <CR-nnn> |
| **Screen ID** | <SCR-nn (existing) / new: next free ID> |
| **Component** | `frontend/src/app/components/<feature>/<name>.component.ts` |
| **Feature module** | `<feature>.module.ts` (lazy, NgModule-based) |
| **Route** | `<path>` · Guard: <`AuthGuard` / —> |
| **SEO** | title: "<…>" · description: "<…>" · canonicalPath: `<path>` / N/A |

## Layout (render order)

| # | Section | Elements | Shared components |
|---|---|---|---|
| 1 | <header> | <…> | <`app-screen-header`> |

## Inputs & Bindings

| Element | Binding | Source |
|---|---|---|
| <list> | `*ngFor` | `<service.method()>` |

## User Actions

| Element | Handler | Calls | Result |
|---|---|---|---|
| <button> | `<onX()>` | `<Service.method()>` | <navigate / dialog / toast> |

## States

| State | Display |
|---|---|
| Loading | <spinner via `SpinnerInterceptor` / local> |
| Empty | <message + translation key> |
| Error | <message + translation key> |
| Offline | <behaviour> |

## Translation Keys (add to all 13 files)

| Key | EN text |
|---|---|
| `<SECTION.KEY>` | "<…>" |
