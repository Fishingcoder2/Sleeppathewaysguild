# D1 question-bank migration — Phase 1

**Date:** 2026-10-26  
**Status:** Shadow database and read-only API foundation. Current webapps still use their existing static banks.

## Canonical D1 database

Database: `sleep_pathways_tutor_dev`

New tables:

- `spg_questions`
- `spg_question_eligibility`
- `spg_question_versions`
- `spg_question_releases`
- `spg_question_sync_runs`

Existing LMS/library tables remain unchanged.

## Shadow import

### RPSGT

- Effective records: **3,240**
- Preserved source records: **2,920**
- Approved overlay records: **320**
- Explicit new-session exclusions: **16**
- Direct-task Practice eligible: **3,219**
- Direct-task Readiness eligible: **3,219**
- Base Mock-eligible after explicit structural flags: **3,120**
- Manual-review provenance flags retained: **560**

The manual-review flag is provenance and does not by itself block learner use after owner release approval. Explicit `learner_excluded`, retired, unpublished, malformed, cross-task, visual, and explicit Mock exclusions continue to control relevant surfaces.

### RPSGT Domain 2 / LMS synchronization

- D2A: **543**
- D2B: **168**
- D2C: **330**
- D2A/D2C unresolved cross-task records: **5**
- Direct-task D2 rows eligible for LMS synchronization: **1,041**

The five cross-task D2A/D2C records remain held from automatic LMS task assignment.

### CPSGT

- Canonical records: **600**
- D1A 50
- D1B 50
- D1C 50
- D1D 50
- D2A 150
- D2B 50
- D3A 100
- D3B 100

The CPSGT shadow import comes directly from the current standalone app's `APP_DATA` package.

## API contract

The Worker exposes read-only routes:

- `GET /api/question-bank/version?program=RPSGT`
- `GET /api/question-bank/version?program=CPSGT`
- `GET /api/questions?program=RPSGT`
- `GET /api/questions?program=RPSGT&domain=D2&taskCode=D2B`
- `GET /api/questions?program=RPSGT&surface=lms-d2`
- `GET /api/question/{id}`

No write/admin API is exposed.

## Migration boundary

This phase does **not** switch RPSGT V2, RPSGT V3, CPSGT, or the LMS to live API reads. Existing URLs, local browser progress, reports, and static fallback banks remain unchanged.

Cutover order remains:

1. RPSGT V3 with static fallback.
2. CPSGT with static fallback.
3. RPSGT V2 last.
4. LMS D2 synchronization consumes the same canonical eligibility data but remains private/admin-controlled.

No D2A/D2C automatic remapping is permitted.
