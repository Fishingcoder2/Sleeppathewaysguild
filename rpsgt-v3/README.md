# RPSGT Learning Center v3 — Foundation Scaffold

This directory is the non-destructive modular rebuild of the Sleep Pathways Guild RPSGT application.

## Current development milestones

- Five connected learner destinations: Dashboard, Guided Study, Practice & Exam, Skills Labs, and Reports.
- Shared responsive shell inspired by the clearer CPSGT navigation pattern.
- One new versioned browser-storage record: `spg_rpsgt_v3`.
- Read-only detection and preview of the current RPSGT storage records.
- Canonical four-domain, twelve-task blueprint data shared by Guided Study and Practice.
- Complete 2,887-question bank extracted into 13 validated task modules.
- Full Practice Center with domain/task filtering and lazy task-module loading.
- Learner practice excludes all 560 manual-review records by default.
- Separate quality-review mode preserves those 560 records without changing learner progress.
- Existing public RPSGT and laboratory files remain unchanged.
- All pages are marked `noindex,nofollow` during development.

## Legacy storage currently recognized

- `spg_rpsgtv2_2026_evolved_v10_5_1`
- `spg_rpsgtv2_flash_flags_v1262a`
- `spg_flash_flags_59b`
- `spg_mathcoach_lesson_59b`
- `spg_math_notes_59b_*`

The preview does not import, overwrite, or delete any legacy record. `createMigrationDraft()` builds an in-memory candidate only. A user-facing import action must not be enabled until field mapping and regression tests are complete.

## Next milestone

1. Add missed-question and mastered-question review sessions against the complete bank.
2. Build readiness checks separately from ordinary practice.
3. Recreate the 175-question mock exam with preserved weighting, timing, navigation, and history.
4. Connect complete-bank results to modular reports.
5. Continue Guided Trail and laboratory migration without changing the current public application.
