# RPSGT Webapp Current-App Inventory

**Document status:** Version 0.1 — foundation inventory  
**Legacy application:** `RPSGTv2.2026-core.html`  
**Protected legacy blob SHA:** `de45e791fa6db38687f4f0953a11f781480e093a`  
**Rule:** Do not structurally edit or replace the protected legacy core during the rebuild.

## Purpose

This document records the functions that must be preserved, evaluated, rebuilt, merged, retired, or archived before the new RPSGT application replaces the working legacy application.

The inventory separates three levels of certainty:

- **Confirmed in the current source:** directly visible in the present core application.
- **Confirmed through project use:** repeatedly observed, tested, or discussed during development.
- **Pending line-level audit:** requires detailed extraction from the monolithic source before migration.

## 1. Current technical condition

| Item | Current condition | Rebuild decision |
|---|---|---|
| Application format | One large HTML file containing markup, styles, data, and logic | Split into modules, shared assets, and structured data files |
| Approximate source size | 21,145 lines; about 6 MB | Preserve as read-only legacy reference |
| Public entry | Lightweight wrapper loads the protected core | Keep until replacement passes acceptance testing |
| Styling | Large embedded CSS system with responsive rules | Move to base, component, mobile, print, and accessibility stylesheets |
| Navigation | Horizontal application navigation controlling hidden/active sections | Replace with routed, mobile-first navigation and a clear dashboard |
| Question UI | Embedded question, answer-option, feedback, and progress components | Rebuild as one reusable question engine |
| Content storage | Questions, lessons, references, and interface logic embedded in the HTML | Move to versioned JSON/data records |
| Analytics | Google Analytics and Ahrefs scripts are present | Audit against privacy policy and consent requirements |
| Security policy | Content Security Policy is embedded | Rebuild and test a modern CSP after module architecture is stable |
| Accessibility | Existing focus styles and minimum control sizes are present | Perform a complete WCAG-oriented audit and preserve visible focus |

## 2. Major learner-facing areas

### Confirmed or project-validated areas

| Area | Current role | Rebuild action |
|---|---|---|
| Home / Study Trail landing | Opens into the study experience but has become crowded and unclear | Replace with a point-of-service dashboard |
| Continue from last visit | Desired persistent return path | Make the primary action on the dashboard |
| BRPT domain study trail | Organizes study by exam domains | Preserve and rebuild from official blueprint data |
| Practice questions | Topic and domain practice | Preserve through the shared question engine |
| 175-question mock exam | Full-length exam simulation | Preserve locked weighting and randomization rules |
| Reports | Guide Trail, practice, readiness, and mock-exam reporting | Consolidate into one report center with drill-down views |
| Math Coach | Calculation teaching and practice | Keep as a dedicated lab, not the default first screen |
| Skill Labs | Interactive technical learning modules | Rebuild as separately loadable modules |
| EKG Lab | Sleep-technologist-focused EKG instruction | Preserve as a dedicated module using approved original visuals |
| Frequency Lab | Frequency, timing, waveform, and calculation practice | Preserve as a dedicated module |
| Hookup / electrode-placement learning | Technical setup and placement learning | Preserve and verify terminology and diagrams |
| Reference library | Definitions, sources, and study references | Replace with a searchable, versioned reference catalog |
| Search | Existing reference search has had reliability problems | Build one indexed search service for lessons, terms, questions, and references |
| Notes / bookmarks | Learner retention and return tools | Preserve only after storage keys and behavior are audited |
| Progress tracking | Records learner activity and readiness | Replace with a documented storage model and migration strategy |

## 3. Mock exam locked requirements

The rebuilt mock exam must:

- contain 175 questions;
- randomize on every launch;
- draw only from active, approved, current, in-date questions;
- preserve the current official BRPT blueprint weighting;
- contain 150 scored-style questions and 25 pretest-style items in the learner simulation when that remains consistent with current BRPT materials;
- support pause and safe recovery;
- warn about unanswered questions;
- provide review before submission;
- keep answers hidden during the active examination;
- produce domain- and task-level results after submission;
- link missed concepts to lessons, references, labs, and reading assignments;
- never use retired, superseded, review-needed, or out-of-date questions.

## 4. Content integrity inventory

Every current question must eventually be classified as:

- retain unchanged after review;
- revise for current authority;
- rewrite for clarity or originality;
- remap to the correct BRPT task;
- duplicate;
- inactive pending review;
- superseded;
- archived;
- prohibited because it resembles recalled confidential exam content.

No question should enter the rebuilt practice or mock-exam pools until it has:

- a stable question ID;
- an active/inactive control;
- a start date;
- an optional end date;
- an approval status;
- a source-review status;
- blueprint and task mapping;
- an original rationale;
- an authority record;
- a last-reviewed date;
- a next-review date;
- a change-history record.

## 5. Known usability problems to correct

- The initial experience can feel like a long mind map rather than a focused application.
- Math Coach appears in multiple locations and has sometimes dominated the opening experience.
- Some actions move the page without making the newly opened content obvious.
- Reports are separated and do not feel like one coherent reporting system.
- Large sections underuse desktop width while other components become oversized.
- Mobile navigation requires too much scrolling and context switching.
- Repeated or overlapping features create uncertainty about where a learner should begin.
- Reference search has not consistently returned expected results.
- EKG and other visual labs require strict control of image scale, terminology, and signal accuracy.
- Embedded data and logic make small edits capable of damaging unrelated features.

## 6. Detailed audit still required

Before migration begins, the legacy core must be inspected for:

- all section IDs and navigation targets;
- every button label and event handler;
- all question arrays and question counts;
- all report calculations and thresholds;
- all localStorage and sessionStorage keys;
- all progress, notes, bookmark, and recovery formats;
- all external URLs;
- all Amazon links and affiliate tags;
- all disclosures and legal notices;
- all image sources and ownership status;
- all duplicated functions and CSS rules;
- all inline event handlers;
- all hidden, obsolete, or unreachable sections;
- all print/export behavior;
- all analytics and third-party scripts;
- all candidate-handbook, blueprint, scoring-manual, and guideline references.

## 7. Migration status legend

Use these labels throughout the rebuild:

- **Legacy only** — still available only in the protected app.
- **Mapped** — feature and dependencies documented.
- **In rebuild** — replacement module under development.
- **Testing** — functional and content review underway.
- **Validated** — passed technical, content, mobile, and accessibility checks.
- **Released** — available in the new application.
- **Retired** — intentionally removed with a recorded reason.

## 8. Acceptance rule

The public entry must not switch to the new application until every retained legacy function is either:

1. validated in the new build;
2. intentionally retired with written justification; or
3. preserved through an approved temporary legacy link.
