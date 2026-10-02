# SalahTime — Working Context

This folder is the **SalahTime Workstation**: the docs-and-skills workspace
for the SalahTime product. It holds methods, templates, analysis reports,
status and feedback. It holds **no application code** — the code lives in the
sibling folders of this repo (`../frontend`, `../backoffice`, `../api`,
`../database`).

**START HERE EVERY SESSION:** read `Product/CURRENT_STATUS.md` before doing
anything else. It is the single, always-current "where are we / what's next"
file. Update it in place — never append dated status blocks to this file.

## What SalahTime Is

An Islamic prayer-times product: web site (`https://salah-times.in/`) and
Android app (`com.wallet.salahtime`, built from the same Angular code with
Capacitor), plus a back office and a PHP API. Full stack facts:
`Engineering Skills/Project-Context.md`.

## How Work Flows (two tracks)

1. **Reverse engineering** — the app is largely built; existing code is
   documented as an as-built baseline, module by module
   (`Engineering Skills/Reverse-Engineering/RE-Method.md`).
2. **Change requests & new features** — every upcoming change is designed,
   approved, built and verified with AI against that baseline, then the
   baseline is updated (`Engineering Skills/Change-Request/CR-Method.md`).
   **No code is written for a CR/NF before its design is approved.**

Index of all methods and templates: `Engineering Skills/README.md`.

## Workstation Layout

| Folder | Purpose |
|---|---|
| `Engineering Skills/` | Methods and templates — *how* we produce each artifact (index in its `README.md`) |
| `Product/Screens/` | One analysis report per screen + `SCREEN_INVENTORY.md` |
| `Product/Modules/` | Per-module as-built FDS / HLD / LLD (Prayer Times, Zikar, Duas, Community, Auth, …) |
| `Product/Change Requests/` | One folder per CR / NF + register `README.md` |
| `SOCK/` | Catalogue of shared, reusable building blocks (services, shared components, dialogs, models) |
| `Feedbacks/` | Dated issue / fix reports + `INDEX.md` |
| `VERSION.md`, `Release Notes/` | Versioning of this workstation itself |

## Working Rules

- **Evidence over opinion.** Every finding in an analysis or feedback report
  cites the source as a repo-relative path with line number
  (`frontend/src/app/components/tasbih/tasbih.component.ts:135`). A finding
  with no evidence is not written down.
- **Method stays in the method file.** Templates and method files explain
  *why* a convention exists; artifacts (screen reports, designs) only apply it
  and state project facts. Never paste methodology paragraphs into an artifact.
- **One owner per fact.** Stack facts live in `Project-Context.md`, screen
  list in `SCREEN_INVENTORY.md`, shared building blocks in `SOCK/`. Other
  files point to them instead of restating them.
- **Never copy secrets into this workstation** — no keystore/`.pem` contents,
  passwords, FTP credentials, API keys or service-account JSON. Refer to where
  a secret is configured (e.g. "GitHub secret `ANDROID_KEYSTORE_PASSWORD`"),
  never its value.
- **Never query a database** (local, dev or production) unless the user asks
  for a specific, stated purpose.
- **Every fix gets a feedback entry.** When a bug is diagnosed and fixed, add
  `Feedbacks/FEEDBACK_<yyyy-mm-dd>_<slug>.md` and a row in `Feedbacks/INDEX.md`.
- **Keep status current.** After finishing a unit of work (a screen report, a
  module doc), update `Product/CURRENT_STATUS.md` and the relevant inventory row.
- **Version the workstation.** New method/template/module → MINOR bump;
  correction → PATCH. Record it in `VERSION.md` and `Release Notes/`.
