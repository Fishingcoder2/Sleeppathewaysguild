# Sleep Pathways Guild — CPSGT and RPSGT Guided Trail / Practice variety audit

**Date:** October 13, 2026  
**Status:** Read-only development audit; **no active questions, scoring, progress, badges, learner routing or production files changed**.  
**Source:** Repository `Fishingcoder2/Sleeppathewaysguild`, `main` at `4921f685aa168b198616b63ec18903c901cd4c40`.  
**Reproducible audit:** [GitHub Actions run 38451865286](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38451865286), workflow `rpsgt-cpsgt-guided-practice-coverage-audit-2026.yml`, script `rpsgt-v3/scripts/audit-dual-app-guided-practice-discovery-2026.mjs`. Node execution **passed**.

## Executive findings

1. **Critical CPSGT Guided Trail routing defect.** Official-task five-question badge sessions call `taskQuestionPool(taskId, pool)` with **all questions from the domain**. That helper ranks tokens from the trail stop's description and takes up to 40 matches but **never restricts to the same official task code**. When fewer than five keyword matches are found, it returns the *entire domain pool*. Across the eleven live Guided Trail stops, **9 of 11** candidate pools included cross-task questions: **86 of 250** pooled records (**34%**, counting records separately at each stop). These are candidate-pool counts, not measured delivered sessions.
2. **Severe example:** CPSGT stop `d2-1-2`, *Core respiratory math*, official task `D2B`, selects **40 candidates, of which only 1 is D2B and 39 are D2A**. That produces an approximately **97.5% off-task random draw risk per question** for that stop as implemented, before any other filters. Do not infer an actual learner completed-session rate from this code audit.
3. **RPSGT Guided Trail is better protected.** `guided-trail-engine.js` enforces exact task codes; `guided-trail-explorer.js` prefers unseen question IDs/prompts; `guided-question-diversity.js` compares phrasing/topic and the last **three** checkpoints, with fallback when variety is scarce.
4. **Practice repetition is still a design weakness.** RPSGT `core/practice.js` samples `shuffle(pool).slice(0,size)`; CPSGT focused task Practice usually does the same (some Quick Check and Domain modes use task-weighted quotas). Neither normal session selector uses the same recent semantic-family diversity protection already available in RPSGT Guided Trail.
5. **Quantity is not the same as distinct learning decisions.** RPSGT has **2,680 eligible questions** of **3,240 effective records** (2,920 originals + 320 approved additions, 560 held). CPSGT has **600 questions** across eight official tasks. Neither raw count establishes adequate applied-scenario depth or clinic-safe answer validity.

## CPSGT Guided Trail — direct code-level cross-task routing audit

The app embeds `APP_DATA.questions`, `DOMAIN_DATA` and **11** `TRAIL` stop definitions. The tested helper matches terms from the stop label and draws at random from the resulting pool; it does not filter `handbookAlignment.taskCode` before ranking.

| Trail stop | Official task | Candidates | Same-task | Other-task | Other-task share |
|---|---|---:|---:|---:|---:|
| Orders/testing indications `d1-0-0` | D1A | 16 | 7 | 9 | 56% |
| Patient hookup `d1-1-3` | D1B | 12 | 12 | 0 | 0% |
| Impedance/calibrations `d1-1-4` | D1B | 15 | 10 | 5 | 33% |
| Adult PSG protocols `d1-2-0` | D1C | 10 | 10 | 0 | 0% |
| Artifact troubleshooting `d1-3-1` | D1D | 15 | 14 | 1 | 7% |
| Sleep-stage recognition `d2-0-0` | D2A | 14 | 12 | 2 | 14% |
| Respiratory-event recognition `d2-0-2` | D2A | 40 | 33 | 7 | 18% |
| **Respiratory math `d2-1-2`** | **D2B** | **40** | **1** | **39** | **98%** |
| PAP acclimation `d3-0-2` | D3A | 35 | 21 | 14 | 40% |
| Interface fitting `d3-0-3` | D3A | 13 | 12 | 1 | 8% |
| Oxygen monitoring `d3-1-1` | D3B | 40 | 32 | 8 | 20% |

**Minimal safe fix specification (not applied):**

- In `taskQuestionPool` compute the `D#A/B/C/D` official code from `taskId` **before** applying keyword/token matches.
- First filter the bank strictly to `q.handbookAlignment.taskCode === officialCode`; allow no other-task records in the filtered output or fallback.
- Rank stop-specific topics **within that official task** and diversify across subtopics/decision families; if fewer than five stop-specific matches remain, use other vetted questions *within the same official task*, clearly preserving context.
- Prevent immediate repeat question IDs/families on consecutive five-question badge attempts, but allow intentional missed-question remediation and preserve badge history, prior answers and saved progress.
- Add regression tests for all eleven stops verifying 5 valid nonduplicate single-best-answer questions per stop (if the eligible task has five), **zero off-task items** under multiple random seeds, and representative saved badge/progress compatibility. Verify actual production deployment separately.

**Priority:** correct routing and re-test before creating new CPSGT questions.

## CPSGT content distribution — actual 600-question APP_DATA bank

| Official task | Count | Tier distribution | Question variety concern |
|---|---:|---|---|
| D1A Clinical assessment | 50 | 19 foundational, 29 moderate, 2 advanced | Questionnaire 4 and medication 5 subtopic items; consider more patient assessment scenarios |
| D1B Technical preparation | 50 | 32 foundational, 18 moderate | 27 coded direct-knowledge styles; impedance 3, montage 2; improve applied setup and error recognition |
| D1C Procedures/protocols | 50 | 35 foundational, 15 moderate | Mix of adult/pediatric PSG, MSLT, MWT and HSAT; broaden protocol deviations |
| D1D Findings/documentation | 50 | 37 foundational, 13 moderate | Technical event, safety and documentation decision chains |
| **D2A Physiologic recognition** | **150** | **117 foundational, 33 moderate** | **78% foundational**; expand waveform-based applied interpretation rather than recall |
| D2B Calculations/summary | 50 | 35 foundational, 15 moderate | 20 questions typed as calculation; 48/50 distinct stems after numeral normalization; add multi-step error correction |
| **D3A PAP support** | **100** | **74 foundational, 26 moderate** | 74% foundational; increase integrated case-based titration judgement and comfort/troubleshooting decisions |
| D3B Oxygen therapy | 100 | 37 foundational, 51 moderate, 12 advanced-entry | 50 classified under integrated therapy scenarios; ensure they represent genuinely different decisions |

Labels and counts reflect existing `APP_DATA` metadata, not independently validated question difficulty. Near-duplicate numeric variants may normalize to the same stem but are not automatically invalid.

## RPSGT source and learner-eligible pool counts

Counts use all 2,920 original task-module records and the 320 already released overlay records; exclude `qa.manualReviewRecommended`. This does **not** activate the seven new owner-reviewed unpublished drafts.

| Task | Effective records | Learner-eligible | Held | Interpretation |
|---|---:|---:|---:|---|
| D1A Clinical assessment | 249 | 230 | 19 | Many concept-tagged records; add applied intake scenarios selectively |
| D1B Patient/caregiver education | 133 | 120 | 13 | Broaden age, caregiver, language and follow-up decisions |
| **D1C Therapy support** | **97** | **87** | 10 | One of the smallest pools; more varied PAP tolerance/adherence scenarios needed |
| D2A Technical preparation | 543 | 501 | 42 | 155 eligible calculation-tagged and 31 “tricky math” topic entries; do not add generic math in bulk |
| D2B Study procedures | 168 | 142 | 26 | Broaden PSG/MSLT/MWT/pediatric protocol and escalation situations |
| D2C Troubleshooting/documentation | 330 | 287 | 43 | Large but repeated sensor/montage topics; ensure scenario variety |
| D3A Adult scoring | 554 | 391 | **163** | Large QA hold; prioritize validating rule-sensitive held records over bulk additions |
| **D3B Pediatric/infant scoring** | **139** | **115** | 24 | **68 eligible tagged “Concept”**; stronger applied pediatric/infant waveform and age-rule scenarios desired; verify AASM version-sensitive scoring |
| **D3C Reporting/verification** | **390** | **349** | 41 | **211 eligible tagged “Calculation”** (~60%); increase full-report reconciliations and data-quality/interpretation boundary checks |
| D4A PAP administration | 398 | 256 | **142** | Significant QA hold; favor safe review of held entries and applied PAP decisions |
| **D4B Alternative treatments** | **91** | **83** | 8 | Smallest currently eligible task; strengthen distinct mechanisms, referral/oversight and effectiveness follow-up |
| **D4C Oxygen therapy** | **143** | **119** | 24 | **42 eligible “Unit Trap”** and **57 “Beginner”** (~35% and 48%); expand safety/escalation, CO2 concerns, orders and PAP/O2 interaction |
| D2A/D2C review-only | 5 | 0 | 5 | Held, not learner-visible |

Total: **3,240 effective, 2,680 eligible, 560 held.** Type/difficulty tags are author metadata; exact concept novelty requires individual review.

## Implementation priorities (without changing existing bank)

1. **Fix CPSGT Guided Trail official task routing**, especially D2B `d2-1-2`, and add multi-seed stop correctness tests; preserve stored scores/awards.
2. Introduce session-to-session **recent-ID and concept-family rotation for both Practice modes**, with explicit optional revisit/missed-review paths. Reuse the RPSGT Guided Trail's tested concept strategy where appropriate, without over-normalizing different numeric calculations into one stem.
3. Improve **RPSGT D3B**, **D4B**, **D4C** and **D3C** applied-case breadth before increasing already-large categories. Maintain current AASM/manual boundaries and Guild owner RPSGT clinical signoff.
4. Improve **CPSGT D2A** and **D3A** difficulty progression with more genuine scenario/trace-based items, then D1B and D2B practice.
5. Do not change public question counts solely to hit numerical quotas. Every new question needs unique clinical decision, controlling source/APA reference, checked single best answer and plausible distractors, owner review, and learner-history regression.
6. Do not alter existing learner IDs, active questions, answers, badges, 15 protected duplicate-retirement candidates, or the separate V3 deployment gate. No score/release claim follows automatically from this report.

## Scope / limitations

This audit **executes a static GitHub checkout of the apps on `main`** and reconstructs CPSGT question candidate pools from the source selection logic, including keyword-ranking and top-40 fallback. It does **not** replay a specific learner's browser history, prove how many off-task questions any actual learner saw, validate live Cloudflare deploy SHA, assess all clinical answers individually, or certify semantic equivalence of near-duplicate clinical decisions. Documented live-browser and saved-history regression is still required for any selection behavior change.
