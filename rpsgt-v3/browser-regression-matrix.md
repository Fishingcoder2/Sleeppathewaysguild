# RPSGT v3 interactive browser regression matrix

**Scope:** PR #35 on `build/rpsgt-v3-modular` only  
**Release state:** preparation complete; interactive gate not yet passed  
**Safety boundary:** keep PR #35 draft and unmerged; do not enable legacy import; do not modify public or legacy application files.

This matrix separates automated Playwright evidence from required human browser review. A green automated run is useful evidence, but it is not a substitute for the manual desktop, tablet, mobile, print-preview, Save as PDF, and downloaded-file checks listed below.

## Required environments

| Profile | Baseline viewport | Input | Required evidence |
|---|---:|---|---|
| Desktop | 1440 × 900 | Mouse + keyboard | Automated run plus human Chromium review |
| Tablet | 834 × 1112 | Touch emulation and, when available, physical tablet | Automated run plus human responsive review |
| Mobile | 390 × 844 | Touch emulation and, when available, physical phone | Automated run plus human responsive review |
| Print | US Letter and browser default margins | Print preview / Save as PDF | Human preview plus downloaded PDF inspection |

Also sample at least one narrow desktop window around 1024 × 768 and one 200% browser-zoom pass before release.

## Status vocabulary

- **Automated:** covered by `tests/browser/regression.spec.mjs` once Playwright is installed and actually run.
- **Manual:** requires human judgment or an external application/device.
- **Both:** automated evidence plus human review are required.
- **Not run:** no pass is claimed until dated evidence is recorded.

## Core route and navigation matrix

| Area | Desktop | Tablet | Mobile | Mode | Acceptance criteria | Current status |
|---|---|---|---|---|---|---|
| Dashboard | Required | Required | Required | Both | Loads without runtime errors; five destinations are clear; Continue link reflects saved v3 location; no clipping or excess empty space | Not run |
| Guided Study | Required | Required | Required | Both | Domain/task navigation works; Trail state loads; checkpoint actions remain visible; no accidental Practice-history writes | Not run |
| Practice Center | Required | Required | Required | Both | Filters load; 5-question session starts; answer selection and feedback work; controls remain reachable | Not run |
| Missed Review | Required | Required | Required | Both | Empty and populated states render; correct answer can move an item to mastered; navigation remains clear | Not run |
| Mastered Review | Required | Required | Required | Both | Empty and populated states render; incorrect answer can return an item to missed | Not run |
| Readiness 25 | Required | Required | Required | Both | Exact 25-item session starts; early exit works; history remains separate from Practice and Mock | Not run |
| Readiness 50 | Required | Sample | Sample | Both | Exact 50-item session builds and progresses without lag, clipping, or state loss | Not run |
| Readiness 100 | Required | Sample | Sample | Both | Exact 100-item session builds and progresses without lag, clipping, or state loss | Not run |
| Mock home | Required | Required | Required | Both | New-attempt and resume states are understandable; timer remains off by default | Not run |
| Full Mock session | Required | Required | Required | Both | 175-item navigator appears; Previous/Next/Flag work; answered and flagged counts update; no auto-submit | Not run |
| Mock save/resume | Required | Required | Required | Both | Save and exit persists current position and responses; reload and resume return to the saved attempt | Not run |
| Mock completion | Required | Sample | Sample | Manual | Submission confirmation, completion summary, domain/task details, and detailed-report link are readable | Not run |
| Reports Center | Required | Required | Required | Both | Read-only content loads; Practice, Review, Readiness, Mock, Trail, Labs, and study plan remain visibly separate | Not run |
| Mock drill-down | Required | Required | Required | Both | Attempt selection, task rows, missed/unanswered/flagged filters, lazy question review, and v1 aggregate-only fallback work | Not run |
| Study Summary | Required | Required | Required | Both | Summary loads; optional learner name is off; all sections render; no sensitive content appears | Not run |
| Migration export | Required | Sample | Sample | Both | Same-origin page recognizes only approved keys; raw values are not rendered; no storage writes occur | Not run |
| Browser back/forward | Required | Required | Required | Both | Back and forward restore usable pages without blank shells, duplicated sessions, or lost state | Not run |
| Refresh | Required | Required | Required | Both | Refresh preserves intended v3 state and does not alter recognized legacy records | Not run |

## Native Skills Laboratory matrix

For every laboratory: open from the catalog, complete at least one workflow station, verify checkpoint startup, inspect feedback, refresh mid-session, return to the catalog, and confirm that progress writes only to `spg_rpsgt_v3.labs`.

| Laboratory | Route | Desktop | Tablet | Mobile | Automated load/overflow | Manual workflow | Current status |
|---|---|---|---|---|---|---|---|
| Hookup and Electrode Placement | `lab-hookup.html` | Required | Required | Required | Required | Required | Not run |
| EKG Recognition and Response | `lab-ekg.html` | Required | Required | Required | Required | Required | Not run |
| Sleep Staging and Event Scoring | `lab-scoring.html` | Required | Required | Required | Required | Required | Not run |
| Respiratory Signals and Event Recognition | `lab-respiratory.html` | Required | Required | Required | Required | Required | Not run |
| PAP and Titration | `lab-pap.html` | Required | Required | Required | Required | Required | Not run |
| Instrumentation, Filters, and Signal Pathways | `lab-instrumentation.html` | Required | Required | Required | Required | Required | Not run |
| Pediatric and Infant Sleep | `lab-pediatric.html` | Required | Required | Required | Required | Required | Not run |
| MSLT and MWT Protocols | `lab-daytime-testing.html` | Required | Required | Required | Required | Required | Not run |
| Integrated Troubleshooting | `lab-troubleshooting.html` | Required | Required | Required | Required | Required | Not run |
| Math Coach | `lab-math-coach.html` | Required | Required | Required | Required | Required | Not run |

## Responsive and accessibility review

| Check | Desktop | Tablet | Mobile | Mode | Acceptance criteria | Current status |
|---|---|---|---|---|---|---|
| Horizontal overflow | Required | Required | Required | Automated + Manual | No body-level horizontal scrolling; intentional table wrappers remain usable | Not run |
| Navigation visibility | Required | Required | Required | Both | Sidebar and mobile navigation switch appropriately; active destination is clear | Not run |
| Touch targets | N/A | Required | Required | Manual | Primary controls are comfortably tappable and not crowded against viewport edges | Not run |
| Keyboard flow | Required | Required | Required | Manual | Logical tab order; no keyboard traps; dialogs and palettes remain operable | Not run |
| Focus visibility | Required | Required | Required | Manual | Every interactive element has an obvious focus indicator | Not run |
| Zoom / text scaling | Required | Sample | Required | Manual | 200% zoom and mobile text scaling do not hide controls or force unusable two-axis scrolling | Not run |
| Long prompts and rationales | Required | Required | Required | Manual | Long content wraps; buttons remain reachable; no card height or footer collisions | Not run |
| Reduced motion | Sample | Sample | Sample | Manual | No essential information depends on animation | Not run |
| Color/contrast spot check | Required | Required | Required | Manual | Status colors retain readable text and are not the only state cue | Not run |

## Storage and privacy matrix

| Check | Mode | Acceptance criteria | Current status |
|---|---|---|---|
| Legacy record preservation | Both | Recognized legacy keys remain byte-for-byte unchanged during all v3 navigation and activity | Not run |
| Import hard-disabled | Automated + code review | `canImport: false` and `migration.importEnabled: false` remain true throughout | Not run |
| v3 storage isolation | Both | New activity writes only to `spg_rpsgt_v3`; separate histories remain separate | Not run |
| Migration export no-write behavior | Both | Export utility does not create/update v3 or legacy storage | Not run |
| Private export handling | Manual | Raw exports stay only in `rpsgt-v3/tests/private-exports/` and remain Git-ignored | Not run |
| Study Summary default privacy | Both | Learner name is excluded by default; question/answer/rationale/note/search/private-link/raw-storage content is absent | Not run |
| JSON download | Both | Browser download completes; file opens; schema and metrics are readable; prohibited content is absent | Not run |
| CSV download | Both | Browser download completes; file opens in a spreadsheet app; columns remain readable; prohibited content is absent | Not run |

## Print and PDF matrix

| Check | Mode | Acceptance criteria | Current status |
|---|---|---|---|
| Print button binding | Automated | Control invokes browser print behavior | Not run |
| Print stylesheet | Both | Navigation and controls are hidden; report sections remain visible; no clipped cards or blank first page | Not run |
| Page breaks | Manual | Task, diagnostic, Trail, and Lab sections break predictably without orphaned headings | Not run |
| Save as PDF | Manual | Saved PDF opens successfully; text is selectable; all pages are readable; no unexpected truncation | Not run |
| Optional learner name | Manual | Name appears only after explicit opt-in and is absent again when opt-out is restored | Not run |

## Performance and resilience samples

| Check | Mode | Acceptance criteria | Current status |
|---|---|---|---|
| Cold route load | Automated + Manual | No unresolved loading notice, broken fetch, or console error | Not run |
| Mock construction | Both | 175 questions build within a reasonable interactive delay and controls remain responsive | Not run |
| Repeated navigation | Both | Ten-minute mixed navigation does not duplicate event handlers or corrupt state | Not run |
| Offline/static hosting assumptions | Manual | Required local JSON and scripts resolve from the deployed path without server-side routing | Not run |
| Interrupted session | Manual | Closing and reopening a tab preserves only the state intended by the feature | Not run |

## Evidence record

For each actual run, append a dated entry rather than overwriting prior evidence.

| Date/time | Commit SHA | Tester | Browser/device | Scope | Result | Defects / evidence |
|---|---|---|---|---|---|---|
| — | `a0d5c5005874794289a3ff1bdc67df56872a58ea` | — | Preparation baseline | Matrix and harness audit | Not run | No interactive pass claimed |

## Release-gate completion rule

Do not mark the interactive gate passed until:

1. The Playwright suite has been installed and run against the exact candidate SHA, with failures reviewed rather than bypassed.
2. Human desktop, tablet, and mobile checks cover every priority row and all ten laboratories.
3. A full Mock attempt, save/resume path, completion path, history, and drill-down have been exercised.
4. JSON and CSV files have been downloaded and opened outside the browser.
5. Browser print preview and a saved PDF have been visually inspected.
6. Legacy storage preservation has been verified with a representative same-origin browser profile.
7. Every defect is resolved or explicitly documented as a release blocker.
8. PR #35 remains draft and unmerged until the separate representative real-browser export gate is also complete.
