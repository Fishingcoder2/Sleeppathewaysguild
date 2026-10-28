# RPSGT V3 D1 cutover gates (2026-10-28)

This is a staged migration, **not an authorization to deploy or switch production**. RPSGT V2 and CPSGT continue using their existing banks. RPSGT V3 uses its approved static + owner-release modules unless the browser flag `window.RPSGT_D1_SOURCE_ENABLED === true` is deliberately set before the loader runs. The flag is OFF by default.

## Read-only preflight observed on 2026-10-28

Database: `sleep_pathways_tutor_dev`.

- RPSGT: 3,240 total records, 3,240 valid and nonempty `payload_json` records; 3,240 IDs, task codes, prompts, answers, and options agree with D1 indexed columns.
- CPSGT: 600 records with valid nonempty payloads and matching IDs. CPSGT's different source schema is not part of this V3 loader cutover.
- All 3,840 records have eligibility rows. Sixteen RPSGT records currently carry `learner_excluded`.
- Complete D2B baseline comparison: the approved GitHub static module (143) plus owner-release additions (25) exactly matched D1 (168) on IDs, prompts, answers and options.

## Migration bookkeeping blocker

The D1 database already includes the `spg_questions.payload_json` column. The currently inspected `d1_migrations` table did **not** show `0002_question_payload.sql`. SQLite's `ALTER TABLE ... ADD COLUMN` must **not** be blindly rerun against that schema. Before any Wrangler migration, verify the targeted database, review its migration ledger and reconcile this existing-column state using a reviewed procedure. Do not rewrite existing payloads, rename tables, or alter the ledger automatically.

## Required checks before changing the flag

1. Confirm migration bookkeeping, produce a recoverable D1 backup/bookmark, and document who controls rollback.
2. Recheck **all 13 RPSGT task-code groups** against the approved static + owner-release ID set and at minimum prompts, options and answers. Counts alone are not sufficient. Confirm excluded/retired, duplicate-family, source credit and approved publication status.
3. Run D1 API contract tests and negative tests: invalid format, wrong task, count mismatch, unknown IDs, altered prompt/answer/options, D1 unavailability, malformed JSON and timeout. All unsafe cases must fall back to the approved static module.
4. Verify the public / staging Worker route actually responds to `GET /api/questions?program=RPSGT&taskCode=D2B&format=source&limit=1000` with no PHI and without exposing privileged administration endpoints. Confirm response caching and quota behavior.
5. Validate on desktop, tablet and mobile; refresh/resume saved Practice, Guided Study, Readiness, Mock, reports and lab checkpoints. Confirm no changes to V2 or CPSGT.
6. Approve a **separate** small cutover change to set `window.RPSGT_D1_SOURCE_ENABLED=true` only after all gates pass. Observe error/fallback rates. Roll back by leaving/removing the opt-in flag, not by deleting or modifying D1 questions.

## Deployment rule

Do not merge this PR merely because its CI turns green. No database migration, data rewrite, Worker deployment, or learner-facing switch is authorized by the PR itself.
