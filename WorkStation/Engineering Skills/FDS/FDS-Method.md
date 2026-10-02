# FDS — Method

The **Functional Design Specification** is the single source of truth for a
module's *business behaviour*: what it does, the rules it enforces, its
states, settings and errors. It says nothing about *how* it is built (that is
the HLD/LLD).

## Modes

| Mode | Used in | How content is produced |
|---|---|---|
| **As-built** | Reverse engineering (RE-3) | Extracted from code; every row has `path:line` evidence |
| **Delta** | CR / NF (step 3) | New/changed rows written in the CR doc first, merged into the module FDS at doc ripple (step 7) |

## ID Conventions

`<MOD>` is a short module code: `PT` Prayer Times, `SR` Settings & Reminders,
`RM` Ramadan, `ZK` Zikar, `LN` Learn, `DU` Duas, `QB` Qibla, `CM` Community,
`AU` Auth, `ON` Onboarding, `BO` Back office.

| Item | ID | Example |
|---|---|---|
| Capability | `<MOD>-CAP-nn` | `ZK-CAP-02` Schedule zikar reminders |
| Business rule | `<MOD>-BR-nn` | `ZK-BR-04` Interval is at least 1 minute |
| Validation rule | `<MOD>-VR-nn` | `AU-VR-01` Email format on sign up |
| Error | `<MOD>-ERR-nn` | `AU-ERR-03` Invalid OTP |
| Setting / config | `<MOD>-CFG-nn` | `SR-CFG-01` Global reminder sound |

IDs are **never reused or renumbered** — a removed rule is marked `Retired`
with the CR that retired it.

## Rules

- A **business rule** decides an outcome (e.g. which sound plays, which
  prayers notify). A **validation rule** only accepts/rejects input. Keep them
  apart.
- State rules as plain sentences a product owner can read; evidence goes in
  its own column.
- Rules enforced in **both** frontend and API are one rule with two evidence
  references — and a finding if the two disagree.
- No UI layout, no API shapes, no class names in the FDS body — those belong
  to screen reports and the HLD.
