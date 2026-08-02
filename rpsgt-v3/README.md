# RPSGT Learning Center v3 — Modular Rebuild

This directory is the non-destructive modular rebuild of the Sleep Pathways Guild RPSGT application.

## Current development milestones

- Five connected learner destinations: Dashboard, Guided Study, Practice & Exam, Skills Labs, and Reports.
- Shared responsive shell inspired by the clearer CPSGT navigation pattern.
- One versioned browser-storage record: `spg_rpsgt_v3`, currently at schema version 2.
- Read-only detection and preview of the current RPSGT storage records.
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
- GitHub Actions validates full-bank reconstruction, learner/quality separation, Readiness allocation, Mock structure, feedback-index counts, source-map referential integrity, JavaScript syntax, selector contracts, and the Reports Center’s read-only boundary.
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

The preview does not import, overwrite, or delete any legacy record. `createMigrationDraft()` builds an in-memory candidate only. A user-facing import action must not be enabled until field mapping and regression tests are complete.

## Remaining release gates

1. Complete storage migration tests for legacy Practice, Review, Guided Trail, notes, and mock-style records.
2. Complete Guided Trail checkpoint and report parity.
3. Migrate and validate the laboratory catalog and individual lab experiences.
4. Add mock-result drill-down and printable/exportable study summaries only after report contracts remain stable.
5. Complete interactive desktop/mobile browser regression before considering the draft pull request ready for release.
