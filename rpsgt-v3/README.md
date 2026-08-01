# RPSGT Learning Center v3 — Foundation Scaffold

This directory is the non-destructive modular rebuild of the Sleep Pathways Guild RPSGT application.

## Foundation milestone

- Five connected learner destinations: Dashboard, Guided Study, Practice & Exam, Skills Labs, and Reports.
- Shared responsive shell inspired by the clearer CPSGT navigation pattern.
- One new versioned browser-storage record: `spg_rpsgt_v3`.
- Read-only detection and preview of the current RPSGT storage records.
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

1. Extract canonical RPSGT domain, task, subtask, study-target, and source identifiers.
2. Extract the question bank without changing wording, answers, explanations, or mappings.
3. Add automated uniqueness and referential-integrity checks.
4. Connect a small practice slice to the new question engine.
5. Compare results against the preserved RPSGT application before expanding migration.
