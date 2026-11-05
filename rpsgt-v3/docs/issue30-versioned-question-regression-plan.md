# RPSGT V3 — Issue #30 versioned-question safety gate
**Date:** November 5, 2026  
**Status:** AUDIT/PROTOTYPE ONLY — no live integration or learner release

## Purpose

Protect existing RPSGT Practice, Readiness and Mock histories when editorial revisions change a question's stem, answer string, task placement, or rationale. Three owner-editorial-approved revised questions are staged separately in `Fishingcoder2/sleep-pathways-tutor`, Issue #30. They are **not approved for learner release** until independent clinical, source, blueprint, semantic and history checks pass.

### Source files analyzed

- `rpsgt-v3/core/practice.js`: question pool drawn from task modules; learner mode currently does not exclude `qa.manualReviewRecommended` by itself.
- `rpsgt-v3/core/mock.js`: retains all task-bank rows for historical ID lookup, selects new sessions using `RPSGTMockEngine.buildSession`.
- `rpsgt-v3/core/readiness.js`: `loadLearnerBank` filters with `engine.isEligible` **before** `sessionQuestionsFromIds` resolves a saved session. Retiring a previously saved question can make it unresolvable.
- `rpsgt-v3/core/readiness-engine.js` and `mock-engine.js`: normalize *prompt text* for deduplication, not clinical/educational concept.
- `rpsgt-v3/core/storage.js`: stored progress and unfinished attempts reference question IDs; exact saved answer strings may need their historical key.
- `rpsgt-v3/core/owner-question-release.js`: proposed records do not automatically become public; publication of dispatched additions requires multiple explicit gates.

## Non-integrated proof of concept

- `rpsgt-v3/core/versioned-question-registry.js`: builds two independent views: `newSessionBank` (new IDs only for released replacements) and `historicalBank` (retains originals plus published versions), with `resolveSavedIds`.
- `rpsgt-v3/scripts/test-versioned-question-registry-issue30.mjs`: intentionally uses **fictional revised answer choices** against the **three real source question IDs**; validates held state, gate failure, collision failure, immutable old answers, new-session supersession, old session resolution.
- Existing production pages **do not import** this helper. This branch is a non-serving review experiment. All release flags remain in held/not-eligible state.

## Proposed integration sequence — do NOT execute until QA approvals

1. **Source and owner gates:** Verify current AASM pediatric CO₂ rule; resolve D2B vs D3B; confirm exact published citations and APA references; semantic family review; owner release authorization. Do not infer clinical signoff from editorial approval.
2. **Version design:** Assign a new stable public ID to each approved replacement; store `revisionOf`, canonical family and an immutable snapshot or stable content hash for each version. Never overwrite old answer keys. Separate source/evidence records from learner-facing APA citations.
3. **Readiness loader fix:** Retain the complete task bank in a historical lookup. Use only an explicitly approved, eligibility-filtered `newSessionBank` for `buildSession`, but resolve `activeSession.questionIds` against the historical lookup, preserving the order and original keys. Assert `50/50` IDs before allowing resume.
4. **Mock loader:** Keep `questionMap` against the entire historical view, but send `newSessionBank` to `buildSession`. Ensure historical 175-item attempts, flagged IDs and reports still resolve to original versions.
5. **Practice, Review and Reports:** New sessions use the filtered view; historical missed/mastered/flagged records and full reports continue to resolve previous IDs. Never silently reinterpret old responses against a changed key.
6. **Semantic-family controls:** Flag close paraphrases like pediatric PAP fear/coaching and pediatric CO₂ vs oximetry. Unlike a literal prompt-normalizer, concept-level family labels must be editorially verified; do not automatically discard distinct learning objectives.
7. **Manual-review policy:** Decide separately whether `qa.manualReviewRecommended` blocks new learner exposure. Current engines intentionally allow many such legacy records. Changing the global rule affects hundreds of records and needs a count/coverage impact audit.
8. **Regression and rollout:** Run repo unit tests, Playwright fictional-learner flows for Practice/Readiness/Mock/Review/Reports, old vs new question keys, version pinning, interrupted-session recovery and rollback; compare blueprint weighting and unique-ID totals. Only after tests and explicit release gates, deploy a controlled release and verify the actual deployed assets.

## Failure conditions

- An old learner response is graded using a new revision's answer string.
- Previously saved readiness/mock item cannot be found by original ID.
- A held proposal is included in `newSessionBank`.
- Two published revision records reuse an ID or supersede the same original.
- A manual-review/clinical/source/blueprint hold is mistaken for publication approval.
- A stem-level duplicate is assumed to prove concept-level uniqueness.
- Tests use live student records or overwrite existing learner history.

## Review notes

The prototype checks these core properties but **does not** prove integration into V3 pages, deployed-browser behavior, preservation of all source/version metadata or clinical accuracy. The isolated seed simulations of 2,920 V3 source records are documented in Tutor Issue #30, Phase 3H. No claim of a fully passed release gate until actual browser integration and all clinical/editorial checks are complete.
