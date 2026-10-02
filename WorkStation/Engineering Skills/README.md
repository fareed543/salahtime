# Engineering Skills — Index

SalahTime is largely built, so the skills run on **two tracks**:

1. **Reverse engineering** — turn existing code into an as-built baseline.
2. **Change requests & new features** — design, build and verify each change
   with AI against that baseline, then update it.

```
Track 1  RE-Method ──► Screen-Analysis ──► SOCK ──► FDS ──► HLD ──► LLD (complex units)
                                                                  │
                                                         module = Baseline
                                                                  │
Track 2  CR-Method: Intake ► Impact ► Design delta (FDS/HLD/LLD) ► Approve ► Build (Development-Skill) ► Verify ► Doc ripple
```

| File | Track | Purpose |
|---|---|---|
| `Project-Context.md` | Both | Stack, apps, key technical facts |
| `Reverse-Engineering/RE-Method.md` | 1 | Phases RE-0 … RE-6, module done criteria |
| `Screen-Analysis/Screen-Analysis-Method.md` + `-Template.md` | 1 | Screen-wise analysis report |
| `FDS/FDS-Method.md` + `FDS-Template.md` | Both | Business behaviour — as-built or delta |
| `HLD/HLD-Method.md` + `HLD-Template.md` | Both | Six-hat design (Data, Process, Rules, API, UI, Native) |
| `LLD/LLD-Method.md` + `Templates/` | Both | Build-ready unit specs: Data, API, Service, Screen, Native |
| `Change-Request/CR-Method.md` + `CR-Template.md` | 2 | CR / NF lifecycle, impact analysis, ripple checklist |
| `Development/Development-Skill.md` | 2 | Codebase conventions + verification checklist |
| `Environment/Build-and-Release.md` | Both | APK build, CI, deploy |
