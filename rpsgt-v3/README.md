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
- The compact feedback index validates question IDs without loading question prompts, options, answers, rationales, or textbook content into migration code.
- Learner-practice IDs, manual-review IDs, unknown IDs, malformed IDs, and duplicates are classified separately. Manual-review records never enter learner missed or mastered remediation.
- Practice, Readiness, and Mock histories remain separate. Unclassifiable history stays unresolved rather than being guessed into a report family.
- `D2A/D2C` statistics remain unresolved and are never silently reassigned.
- Flash-flag conflicts use explicit source priority and are reported for manual review; conflicting sources are not silently merged.
- Unknown fields, malformed records, impossible totals, count mismatches, source conflicts, and parse failures are preserved in structured blocking, warning, notice, and unresolved sections.
- Stable migration fingerprints include source hashes, target schema version, and migration-engine version. Duplicate fingerprints and existing non-empty v3 data are blocking conditions.
- Every preview includes rollback metadata, the prior v3 checksum, a backup snapshot, write-verification requirements, and restore-on-failure instructions. Import remains hard-disabled.
- The deterministic migration test matrix covers 26 fixture scenarios plus a compatibility test against the generated 2,887-record feedback index.
- Canonical four-domain, twelve-task blueprint data shared across learning modules.
- Complete 2,887-question bank extracted into 13 validated task modules.
- Full Practice Center with domain/task filtering and lazy task-module loading.
- Learner Practice uses 2,327 eligible records and excludes all 560 manual-review records.
- Separate Quality Review preserves those 560 records without changing learner progress.
- Missed Question Review and Mastered Question Review use the complete learner-practice bank.
- Correct missed answers move to mastered; incorrect mastered answers return to missed.
- Separate 25-, 50-, and 100-question Readiness Checks preserve weighted domain allocation, task balancing, question-family deduplication, raw scoring, an internal study-weighted gauge, domain results, and weak-task study targets.
- Separate 175-question Mock-Style Practice uses 150 scored-style and 25 mixed unscored-style items, preserving D1 30, D2 41, D3 38, and D4 41 across the scored set.
- Mock attempts support randomized construction, navigation, a 175-question palette, flags, save-and-resume, optional elapsed-time tracking, scored-domain results, weak-task targets, and separate history.
- Practice, Review, Readiness, and Mock records remain technically and visibly separate.
- The modular Reports Center reads those records without writing to them and provides task-level progress, missed/mastered status, separate diagnostic histories, and Coach Bob study directions.
- Reports use a compact generated feedback index containing question IDs and classification metadata only; it contains no prompt, option, answer, or rationale text.
- Six library sources are outlined into focused chapter/section locations: the AASM Scoring Manual v3, Fundamentals of Sleep Technology, Polysomnography for the Sleep Technologist, A Clinical Guide to Pediatric Sleep, the AAST terminology reference, and a sleep-stage scoring companion.
- All 12 RPSGT task codes have a defined source sequence, and 20 topic families provide more specific routes for instrumentation, artifact, staging, respiratory scoring, calculations, PAP, pediatrics, safety, and related weak areas.
- Rule-sensitive feedback begins with the current official AASM section before textbook reinforcement and focused practice.
- Chapter and section titles are navigation aids only. The app does not reproduce textbook prose, figures, tables, proprietary scoring rules, or publisher question banks.
- GitHub Actions validates full-bank reconstruction, learner/quality separation, Readiness allocation, Mock structure, feedback-index counts, source-map referential integrity, JavaScript syntax, selector contracts, Reports read-only enforcement, and storage-migration safeguards.
- Interactive desktop/mobile browser regression is still required before merge; the available development environment blocks localhost and local-file URLs by organization policy.
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
2. Complete Guided Trail checkpoint and report parity.
3. Migrate and validate the laboratory catalog and individual lab experiences.
4. Add mock-result drill-down and printable/exportable study summaries only after report contracts remain stable.
5. Complete interactive desktop/mobile browser regression before considering the draft pull request ready for release.
