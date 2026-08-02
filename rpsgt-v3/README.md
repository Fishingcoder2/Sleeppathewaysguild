# RPSGT Learning Center v3 — Modular Rebuild

This directory is the non-destructive modular rebuild of the Sleep Pathways Guild RPSGT application.

## Current development milestones

- Five connected learner destinations: Dashboard, Guided Study, Practice & Exam, Skills Labs, and Reports.
- Shared responsive shell inspired by the clearer CPSGT navigation pattern.
- One versioned browser-storage record: `spg_rpsgt_v3`, currently at schema version 2.
- Read-only detection and preview of the current RPSGT storage records.
- `core/migration-engine.js` is a pure legacy-migration engine. It accepts supplied records as data, builds an in-memory report, and never reads from or writes to browser storage directly.
- `core/storage.js` only discovers the recognized browser-storage records and passes a read-only snapshot to the engine. `core/legacy-migration.js` remains a compatibility alias.
- Migration discovery records key presence, byte size, parse status, record type, source priority, and stable source hashes.
- Migration validation covers Practice totals, domain/task statistics, explicit history modes, missed/mastered/flagged IDs, Guided Trail position and checkpoints, awards, labs, notes, searches, readiness-like records, mock-style records, and Math Coach data.
- Learner-practice IDs, manual-review IDs, unknown IDs, malformed IDs, and duplicates are classified separately. Manual-review records never enter learner missed or mastered remediation.
- Practice, Readiness, and Mock histories remain separate. Unclassifiable history stays unresolved rather than being guessed into a report family.
- `D2A/D2C` statistics remain unresolved and are never silently reassigned.
- Flash-flag conflicts use explicit source priority and are reported for manual review; conflicting sources are not silently merged.
- Unknown fields, malformed records, impossible totals, count mismatches, source conflicts, and parse failures are preserved in structured blocking, warning, notice, and unresolved sections.
- Stable migration fingerprints include source hashes, target schema version, and migration-engine version. Duplicate fingerprints and existing non-empty v3 data are blocking conditions.
- Every preview includes rollback metadata, the prior v3 checksum, a backup snapshot, write-verification requirements, and restore-on-failure instructions. Import remains hard-disabled.
- The deterministic migration matrix covers 26 unit scenarios, a compatibility test against the generated 2,887-record feedback index, and two sanitized source-derived export fixtures.
- `scripts/validate-storage-export.mjs` validates supplied JSON exports without writing browser storage. The included fixtures are explicitly marked `realBrowserExport: false`; representative real learner exports remain a release gate.
- Canonical four-domain, twelve-task blueprint data is shared across learning modules.
- Guided Trail study marks, current focus, five-question task checkpoints, task awards, domain awards, and checkpoint history now use a pure engine and the versioned v3 record.
- Guided Trail checkpoints use learner-eligible task records only, exclude manual-review and `D2A/D2C` records, require 80% for a task award, retain failed attempts, and never enter ordinary Practice, Readiness, or Mock history.
- The Reports Center provides a read-only Guided Trail report with current position, study marks, task/domain awards, and checkpoint history.
- Complete 2,887-question bank extracted into 13 validated task modules.
- Full Practice Center with domain/task filtering and lazy task-module loading.
- Learner Practice uses 2,327 eligible records and excludes all 560 manual-review records.
- Separate Quality Review preserves those 560 records without changing learner progress.
- Missed Question Review and Mastered Question Review use the complete learner-practice bank.
- Correct missed answers move to mastered; incorrect mastered answers return to missed.
- Separate 25-, 50-, and 100-question Readiness Checks preserve weighted domain allocation, task balancing, question-family deduplication, raw scoring, an internal study-weighted gauge, domain results, and weak-task study targets.
- Separate 175-question Mock-Style Practice uses 150 scored-style and 25 mixed unscored-style items, preserving D1 30, D2 41, D3 38, and D4 41 across the scored set.
- Mock attempts support randomized construction, navigation, a 175-question palette, flags, save-and-resume, optional elapsed-time tracking, scored-domain results, weak-task targets, and separate history.
- Practice, Review, Readiness, Mock, Guided Trail, and Skills Lab records remain technically and visibly separate.
- A canonical ten-family laboratory catalog defines stable IDs, progress keys, blueprint-task mappings, migration status, planned routes, and confirmed preserved destinations.
- The laboratory catalog reads mapped `completed`, `started`, `lastLab`, per-lab completion objects, and legacy `catalogIndex` shapes without modifying them.
- Hookup, Sleep Staging and Event Scoring, and Math Coach now have individual v3 laboratory experiences. The preserved EKG destination remains linked; the other catalog-only laboratories remain disabled until their individual parity work is complete.
- The Hookup lab uses a pure progress engine, six app-authored workflow stations, and a ten-question learner-eligible D2A/D2B checkpoint. All stations plus an 80% checkpoint are required for completion, and failed retries never erase completion.
- The Sleep Staging and Event-Scoring lab uses a pure progress engine, seven app-authored review stations, and a ten-question checkpoint balanced across learner-eligible D3A, D3B, and D3C records. It excludes manual-review records, deduplicates prompts and IDs, preserves source-object immutability, requires all stations plus 80%, and keeps failed retries in bounded history without erasing completion.
- The scoring lab classifies broad question families only to improve checkpoint variety. It does not add scoring criteria or reproduce proprietary AASM scoring-manual text, figures, or tables; rule-sensitive decisions remain tied to current official guidance.
- The Math Coach lab uses learner-eligible D3C calculation questions, protected attempt history, migrated lesson-state visibility, and an 80% completion threshold.
- The modular Reports Center reads learner records without writing to them and provides task-level progress, missed/mastered status, separate diagnostic histories, Guided Trail status, and Coach Bob study directions.
- Reports use a compact generated feedback index containing question IDs and classification metadata only; it contains no prompt, option, answer, or rationale text.
- Six library sources are outlined into focused chapter/section locations: the AASM Scoring Manual v3, Fundamentals of Sleep Technology, Polysomnography for the Sleep Technologist, A Clinical Guide to Pediatric Sleep, the AAST terminology reference, and a sleep-stage scoring companion.
- All 12 RPSGT task codes have a defined source sequence, and 20 topic families provide more specific routes for instrumentation, artifact, staging, respiratory scoring, calculations, PAP, pediatrics, safety, and related weak areas.
- Rule-sensitive feedback begins with the current official AASM section before textbook reinforcement and focused practice.
- Chapter and section titles are navigation aids only. The app does not reproduce textbook prose, figures, tables, proprietary scoring rules, or publisher question banks.
- GitHub Actions validates full-bank reconstruction, learner/quality separation, Guided Trail checkpoints and reporting, laboratory catalog contracts, Hookup, Scoring, and Math Coach laboratory behavior, Readiness allocation, Mock structure, feedback-index counts, source-map referential integrity, JavaScript syntax, selector contracts, Reports read-only enforcement, and storage-migration safeguards.
- Interactive desktop/mobile browser regression is still required before merge; no browser interaction pass is claimed.
- Existing public RPSGT and laboratory files remain unchanged.
- All development pages are marked `noindex,nofollow`.

## Library-backed feedback hierarchy

1. Current official rule or protocol source when the topic is version-sensitive.
2. Core sleep-technology textbook chapter for conceptual understanding.
3. Technical, pediatric, or visual companion source when it improves recognition or application.
4. Guided Study and focused practice to verify repair of the weak area.

Private Drive URLs are not placed in public learner data. Public release resources must use approved official, open-access, or clearly disclosed optional resource links.

## Legacy storage currently recognized

- `spg_rpsgtv2_2026_evolved_v10_5_1`
- `spg_rpsgtv2_flash_flags_v1262a`
- `spg_flash_flags_59b`
- `spg_mathcoach_lesson_59b`
- `spg_math_notes_59b_*`

`getLegacySnapshot()` reads these records without modification. `createMigrationDraft()` passes that snapshot to the pure engine and returns an in-memory report containing `draft`, `summary`, `issues`, `unresolved`, `fieldMappings`, `sourceManifest`, `validation`, `fingerprint`, conflict-resolution details, and rollback metadata. It does not import, overwrite, or delete any record. `canImport` and `migration.importEnabled` remain `false`; no user-facing import action is enabled.

## Remaining release gates

1. Validate migration against representative real browser exports and resolve every malformed or ambiguous legacy field before enabling import.
2. Migrate and validate the remaining individual laboratory experiences; Hookup, Scoring, and Math Coach do not establish full laboratory parity.
3. Add mock-result drill-down.
4. Add printable or exportable study summaries after report contracts remain stable.
5. Complete interactive desktop/mobile browser regression before considering the draft pull request ready for release.
