# RPSGT Learning Center v3 — Foundation Scaffold

This directory is the non-destructive modular rebuild of the Sleep Pathways Guild RPSGT application.

## Current development milestones

- Five connected learner destinations: Dashboard, Guided Study, Practice & Exam, Skills Labs, and Reports.
- Shared responsive shell inspired by the clearer CPSGT navigation pattern.
- One versioned browser-storage record: `spg_rpsgt_v3`, now at schema version 2.
- Read-only detection and preview of the current RPSGT storage records.
- Canonical four-domain, twelve-task blueprint data shared by Guided Study and Practice.
- Complete 2,887-question bank extracted into 13 validated task modules.
- Full Practice Center with domain/task filtering and lazy task-module loading.
- Learner practice excludes all 560 manual-review records by default.
- Separate quality-review mode preserves those 560 records without changing learner progress.
- Missed Question Review and Mastered Question Review use the complete learner-practice bank.
- Correct missed answers move to mastered; incorrect mastered answers return to missed.
- Quality-review records remain excluded from learner remediation lists.
- Separate 25-, 50-, and 100-question Readiness Checks use the 2,327 learner-practice records only.
- Readiness sessions preserve weighted domain allocation, task balancing, question-family deduplication, raw scoring, an internal difficulty-weighted gauge, domain results, and weak-task study targets.
- Readiness history and resumable active sessions live under `readiness`, separate from ordinary Practice, Review, and Mock records.
- Separate 175-question Mock-Style Practice uses 150 scored-style items and 25 mixed unscored-style items.
- The scored mock set preserves D1 30, D2 41, D3 38, and D4 41; all 12 direct task codes are represented.
- Mock attempts support randomized construction, question-family deduplication, previous/next navigation, a question palette, flags, save-and-resume, optional elapsed-time tracking, scored-domain results, weak-task targets, and separate history.
- The optional mock timer is off by default, never auto-submits, and uses 180 minutes only as an exam-time reference.
- Mock results do not write to ordinary Practice totals, Review lists, or Readiness history.
- GitHub Actions validates full-bank reconstruction, Practice/Review separation, Readiness allocations, Mock scored/pretest structure, JavaScript syntax, and page-selector contracts.
- Interactive browser regression is still required before merge; the current container blocks localhost and file URLs by organization policy.
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

1. Connect Practice, Review, Readiness, and Mock results to modular reports without combining their histories.
2. Add mock-result drill-down and printable/exportable study summaries only after report contracts are validated.
3. Continue Guided Trail and laboratory migration without changing the current public application.
4. Complete storage migration tests for legacy Practice, Review, Trail, notes, and mock-style records.
5. Complete interactive desktop/mobile browser regression before considering the draft pull request mergeable for release.
