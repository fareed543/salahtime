# Change Request & New Feature — Method

**Purpose:** every upcoming change — a Change Request (CR) to existing
behaviour or a New Feature (NF) — is designed, built and verified with AI
against the as-built baseline (`../Reverse-Engineering/RE-Method.md`), and
leaves the baseline docs up to date afterwards.

## Classification

| Type | ID | When |
|---|---|---|
| Change Request | `CR-<nnn>` | Changes behaviour that already exists |
| New Feature | `NF-<nnn>` | Adds a capability that does not exist |
| Defect | — | Use a `Feedbacks/` entry instead, unless the fix changes intended behaviour |

| Size | Rule of thumb | Docs required |
|---|---|---|
| **S** | One screen or one service, no API/DB change | CR doc only |
| **M** | Several files in one module, or an API change | CR doc + FDS/HLD delta |
| **L** | New module, DB schema change, new native capability, or cross-module | CR doc + FDS/HLD delta + LLD for each new/changed unit |

Numbering is shared and sequential across CR and NF (`CR-001`, `NF-002`, …).
Folder: `Product/Change Requests/<ID>_<slug>/` holding `<ID>.md` and any LLDs.

## Lifecycle

| Step | Activity | Output | Gate |
|---|---|---|---|
| 1 Intake | Capture the request in the user's words; restate as goal + acceptance criteria | CR doc §1–2 | User confirms the restatement |
| 2 Impact analysis | Find every affected screen, service, endpoint, table, native asset, translation and route — using the inventory, SOCK and module docs first, then the code | CR doc §3 | — |
| 3 Design delta | State only what changes: FDS rules added/changed, HLD hats touched, LLD for new/changed complex units | CR doc §4 (+ LLDs) | **User approves design before any code** |
| 4 Implementation plan | Ordered task list: data → API → services → screens → native → i18n → SEO | CR doc §5 | — |
| 5 Build | Implement per `../Development/Development-Skill.md` | Code changes | — |
| 6 Verify | Run checks in §6 on web **and** Android; record results | CR doc §6 | All acceptance criteria pass, or failures reported |
| 7 Doc ripple | Update as-built docs so the baseline matches the new code | CR doc §7 ticked | — |
| 8 Close | Version bump, status updated, release notes | Status `Closed` | — |

## Rules

- **No code before step 3 is approved.** S-size CRs may combine steps 1–4 in
  one message for approval.
- **Impact analysis is evidence-based** — each affected item cites `path:line`.
  "Probably also affects X" goes to *Open Questions*, not the impact list.
- **Delta, not rewrite.** The CR doc records only what changes; the module
  FDS/HLD are edited in place during step 7 so they remain the single baseline.
- **Both platforms, always.** Every CR states its web and Android behaviour,
  even when one is "unchanged".
- **Hidden ripple checklist** — check each on every CR:
  translations (all 13 files in `frontend/src/assets/i18n/`), route `data.seo`
  + sitemap, `localStorage` keys / migration of saved data, Android
  notification channels (immutable — bump version), `res/raw/keep.xml`,
  back-office screens editing the same data, API CORS / auth, app version.
- **Never silently widen scope.** Anything found that is outside the CR is
  logged under *Out of Scope / Follow-ups*.
