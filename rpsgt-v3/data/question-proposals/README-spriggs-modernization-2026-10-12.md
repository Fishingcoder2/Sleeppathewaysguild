# Spriggs-based RPSGT question candidate batch — October 12, 2026

**Status:** Editorial proposal, not published, not owner approved.

The batch contains **8 remaining original four-choice case-based questions** mapped to the current BRPT RPSGT D1–D4 task framework. Candidate IDs remain stable with deliberate gaps: `001`, `003`, `004`, `005`, `006`, `008`, `009`, and `010`.

## Source boundaries

- William H. Spriggs (2015), *Essentials of Polysomnography*, 2nd ed. — indexed chapter topics only, with higher-tier current-authority validation.
- William H. Spriggs (2002), *Principles of Polysomnography* — historical topic taxonomy only; obsolete staging/protocols must not govern answers.
- Current AASM Version 3 scoring manual (with errata), AAST technical guidelines, official BRPT candidate materials, adult MSLT protocols (2021) and pediatric MSLT protocols (2024) control answers as applicable.
- Do not publish publisher posttests, copied questions, unverified numerical rules, proprietary PSG figures or exact publisher rationales.

## Existing bank / release

Repository release documentation (Oct 11, 2026): 2,920 extracted originals + 320 owner-approved additions = **3,240** effective unique records; **2,680** learner eligible and **560** held for review. This file is **not** added to `data/owner-approved-question-release.json`, the 12 task modules, or learner interface. Current content releases remain unchanged.

## Before promotion

1. Clinical review of each item's single-best-answer status, distractors, and rule currency, especially adult-versus-pediatric MSLT and pediatric scoring.
2. Use licensed AASM current manual/erratum/FAQ for any scoring-rule nuance; verify all item-specific authority claims.
3. Perform full-bank semantic duplicate/family review and cite evidence by chapter/section with confirmed page locators.
4. Make a separate owner-approved release only once all `manualReviewRecommended` flags are legitimately cleared.
5. Validate all task/module counts, source keys, Mock blueprint weights, practice/review/readiness routes, and learner metadata in CI.

## Automated gate performed before staging

- 8/8 items: exactly four distinct options, unique answer present once, recognized BRPT task, at least two reference keys, `manualReviewRecommended: true`.
- Similarity scan of 1886 accessible current task/release prompts (token overlap, **not a substitute for human semantic duplicate review**).
- Closest neighboring IDs and overlap scores are available in the proposal-generation audit from this work session, but were not treated as pass/fail semantic proof.

## Near-duplicate triage

Six of the initial 16 draft scenarios were removed before review: PAP anxiety (`RPSGT-B3-C022`), ETCO2 kink (`RPSGT-B3-C063`), jaw muscle artifact (`RPSGT-B5-S065`), PAP eye leak (`mine-d1c-003`), oral-appliance referral (`RPSGT-B3-C137`), and poor-pleth desaturation (`RPSGT-B5-S067`). These are editorial analogs, not exact-text duplication. The large D2A/D3A and owner-release files could not be parsed fully via the connector; a complete local review is required before eligibility.

## Complete-bank CI results and manual concept review

GitHub Actions run [38326465399](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38326465399) successfully parsed **all 2,920 original questions plus 320 released additions**. It found zero hard structural/source-key errors and zero matches above the heuristic weighted-token threshold for the then-current 10 drafts. The JSON and Markdown reports are uploaded as a run artifact. **This is not a semantic or clinical signoff.**

Manual review of the nearest existing prompts found two more concept-level repeats: `SPG-SPRIGGS-2026-002` was retired because the bank already tests patient education explaining multiple PSG sensors (`D1B-011`); `SPG-SPRIGGS-2026-007` was retired because the bank already tests sensor loss after repositioning (`D2C-019`). Eight remain, with original IDs retained for an auditable trail.

The proposal now uses exact source keys `aasm-adult-mslt-mwt-2021` and `icsd-3-tr` rather than ambiguous legacy aliases, and explicitly frames the AASM optional adult-criteria age boundary for respiratory scoring with a **nine-year-old** patient who requires pediatric criteria.

See the separate candidate-by-candidate [editorial review](./REVIEW-spriggs-modernization-2026-10-12.md). Every remaining item stays held from learners until clinical accuracy, page-locator, and semantic-duplication reviews are signed off.
