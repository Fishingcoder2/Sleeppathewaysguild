# RPSGT Learning Center v3 — Modular Rebuild

This directory is the non-destructive modular rebuild of the Sleep Pathways Guild RPSGT application. It remains development-only and does not replace the current public app.

## Current development milestones

- Five connected learner destinations: Dashboard, Guided Study, Practice & Exam, Skills Labs, and Reports.
- Shared responsive shell inspired by the clearer CPSGT navigation pattern.
- One versioned browser-storage record: `spg_rpsgt_v3`, currently at schema version 2.
- Read-only detection and preview of recognized legacy RPSGT browser-storage records.
- `core/migration-engine.js` is pure and accepts supplied records as data; it never reads from or writes to browser storage directly.
- `core/storage.js` discovers recognized legacy records and passes a read-only snapshot to the engine. Import remains hard-disabled through `canImport: false` and `migration.importEnabled: false`.
- Migration validation covers Practice totals, domain/task statistics, missed/mastered/flagged IDs, Guided Trail state, awards, labs, notes, searches, readiness-like history, mock-style history, Math Coach records, malformed data, conflicts, duplicate fingerprints, rollback metadata, and source immutability.
- Learner-practice, manual-review, unknown, malformed, duplicate, and ambiguous records remain separately classified. `D2A/D2C` data is never silently reassigned.
- Practice, Review, Readiness, Mock, Guided Trail, and Skills Lab histories remain technically and visibly separate.
- Complete 2,887-question bank extracted into 13 validated task modules.
- Learner Practice uses 2,327 eligible records; 560 manual-review records remain in a separate Quality Review pool.
- Full Practice Center, Missed Review, Mastered Review, weighted 25/50/100 Readiness Checks, and separate 175-question Mock-Style Practice are implemented.
- The Mock preserves 150 scored-style and 25 mixed unscored-style questions, scored domain allocation D1 30, D2 41, D3 38, D4 41, all 12 task codes, navigation, flags, save/resume, and an optional study stopwatch.
- Guided Trail uses learner-eligible task checkpoints, an 80% task-award threshold, study marks, task/domain awards, bounded history, and a read-only Reports summary.
- Reports remain read-only and keep Practice, Review, Readiness, Mock, Guided Trail, and Skills Lab records separate.
- Six library sources are outlined into focused study locations without reproducing protected prose, figures, tables, proprietary scoring rules, or publisher question banks.
- All 12 task codes and 20 topic families have source-routing contracts. Rule-sensitive feedback starts with the current official source before textbook reinforcement and focused practice.

## Complete native Skills Laboratory parity

The canonical catalog contains ten stable laboratory families. All ten now use native v3 routes, versioned Skills Lab progress, deterministic test contracts, and isolated history:

1. Hookup and Electrode Placement
2. EKG Recognition and Response
3. Sleep Staging and Event Scoring
4. Respiratory Signals and Event Recognition
5. PAP and Titration
6. Instrumentation, Filters, and Signal Pathways
7. Pediatric and Infant Sleep
8. MSLT and MWT Protocols
9. Integrated Troubleshooting
10. Math Coach

The catalog reads mapped `completed`, `started`, `lastLab`, per-lab completion objects, and legacy `catalogIndex` shapes without modifying them. Each native laboratory writes only to `spg_rpsgt_v3.labs` through `RPSGTStorage.save`.

### Shared laboratory completion contract

- Workflow stations are app-authored educational prompts.
- Checkpoints use validated learner-eligible question-bank records.
- Manual-review, invalid-answer, duplicate, ambiguous, and unrelated records are excluded.
- Source question objects remain unchanged.
- Selection is deterministic under a supplied seed for testing.
- Completion requires every laboratory station plus an 80% checkpoint unless the laboratory has an explicitly documented equivalent contract.
- Failed retries remain in bounded history and never erase completion.
- Reapplying the same session ID never double-counts an attempt.
- Laboratory results do not write ordinary Practice, Review, Readiness, Mock, or Guided Trail history.

### Laboratory-specific scope

- **Hookup:** six placement and preparation stations plus a learner-eligible D2A/D2B checkpoint.
- **Scoring:** seven review stations and a D3A/D3B/D3C checkpoint; broad families improve variety without reproducing AASM scoring criteria.
- **Respiratory:** seven signal-pathway stations and a D2A/D2B/D3B checkpoint covering airflow, effort, oxygen, carbon dioxide, snore, event context, and signal quality.
- **Instrumentation:** seven acquisition and troubleshooting stations and a D2A/D2B/D2C checkpoint covering derivations, polarity, amplifiers, sensitivity, calibration, filters, sampling, and artifact.
- **PAP:** seven order-to-handoff stations and a D4A/D4B/D4C checkpoint covering interfaces, acclimation, event response, leak, advanced-mode awareness, and documentation.
- **Integrated Troubleshooting:** seven safety-to-documentation stations and a D2B/D2C/D3C checkpoint covering patient events, equipment, signal pathways, corrective action, escalation, and study integrity.
- **Pediatric and Infant Sleep:** seven developmental and caregiver-centered stations and a D1A/D1C/D3A/D3B/D4A checkpoint covering setup, staging context, respiratory and gas-exchange monitoring, safety, and documentation.
- **MSLT/MWT:** seven preparation-to-reporting stations and a D1A/D2C/D3A checkpoint covering sleep scheduling evidence, medications and substances, preceding attended PSG, controlled daytime conditions, trial acquisition, validity, and MWT boundaries. Pediatric MWT normative interpretation is not presented as validated.
- **Math Coach:** learner-eligible D3C calculation questions, migrated lesson-state visibility, protected attempt history, and an 80% threshold.

### Native EKG rebuild decision

The preserve-versus-rebuild assessment selected a native v3 EKG laboratory. The older public `ekg.2026.html` page remains unchanged for current public users and historical reference, but it is no longer the v3 catalog route.

The native EKG laboratory uses seven stations:

1. Verify tracing validity and signal quality.
2. Determine rate and regularity.
3. Review P waves and atrial activity.
4. Review PR/QRS features and the atrial-ventricular relationship.
5. Classify a broad pattern and correlate patient, video, respiratory, oxygen, movement, and neighboring-channel context.
6. Assess symptoms and urgency, then follow facility escalation and emergency procedures.
7. Document onset, duration, pattern, symptoms, interventions, response, notifications, unresolved concerns, and limitations.

Its ten-question checkpoint uses learner-eligible D2B and D3C records. It does not copy the legacy generated rhythm strips, embedded legacy quiz, proprietary scoring rules, or textbook figures. The laboratory is educational review rather than cardiac diagnosis; current AASM guidance, physician orders, facility cardiac-rhythm and emergency procedures, equipment instructions, medical direction, and supervised competency remain authoritative. The detailed decision record is in `data/labs/ekg-rebuild-assessment.md`.

## Automated validation

GitHub Actions validates:

- Full-bank reconstruction, hashes, ordering, schema, and learner/quality separation.
- Practice, Review, Readiness, Mock, Guided Trail, Reports, and migration contracts.
- All ten native laboratory engines, controllers, routes, storage boundaries, completion rules, deterministic selection, history limits, source immutability, and learner-facing scope boundaries.
- Preservation sentinels for the unchanged public EKG page while the v3 catalog points to `lab-ekg.html`.
- Compact feedback-index counts and source-map referential integrity.
- JavaScript syntax and HTML selector/script-order contracts.
- Reports read-only enforcement and legacy-storage read-only enforcement.
- Twenty-six deterministic storage-migration scenarios and sanitized source-derived fixtures.

Automated laboratory parity does not establish interactive browser parity.

## Library-backed feedback hierarchy

1. Current official rule or protocol source when the topic is version-sensitive.
2. Core sleep-technology textbook chapter for conceptual understanding.
3. Technical, pediatric, cardiac, or visual companion source when it improves recognition or application.
4. Guided Study and focused practice to verify repair of the weak area.

Private Drive URLs are not placed in public learner data. Public release resources must use approved official, open-access, or clearly disclosed optional resource links.

## Legacy storage currently recognized

- `spg_rpsgtv2_2026_evolved_v10_5_1`
- `spg_rpsgtv2_flash_flags_v1262a`
- `spg_flash_flags_59b`
- `spg_mathcoach_lesson_59b`
- `spg_math_notes_59b_*`

`getLegacySnapshot()` reads these records without modification. `createMigrationDraft()` produces an in-memory report containing the draft, summary, issues, unresolved fields, mappings, source manifest, validation, fingerprint, conflict-resolution details, and rollback metadata. It does not import, overwrite, or delete any record.

## Remaining release gates

1. Validate migration against representative real browser exports and resolve every malformed or ambiguous field before enabling import.
2. Add mock-result drill-down.
3. Add printable or exportable study summaries after report contracts remain stable.
4. Complete interactive desktop and mobile browser regression before considering the draft pull request ready for release.

Existing public RPSGT and laboratory files remain unchanged. All development pages are marked `noindex,nofollow`. PR #35 must remain draft and unmerged until the release gates are satisfied.
