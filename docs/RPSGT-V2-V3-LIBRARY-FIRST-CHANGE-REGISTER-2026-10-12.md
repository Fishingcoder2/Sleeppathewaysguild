# RPSGT V2 + V3 coordinated change register — Guild library-first development
*October 12, 2026 | Development branch only | No live deployment authorized*

## Grounded repository facts

- V2 entry point: `RPSGTv2.2026.html`, a self-contained canonical HTML application with one embedded `script#app-data` seed package.
- V2 importer: `scripts/public-question-release-v2.mjs`; releases are approved in `data/owner-approved-question-release.json`.
- V3 entry point: `rpsgt-v3/index.html`; modular study, practice, review, readiness, mock, flashcards, laboratory, reporting and reference surfaces.
- V3 runtime owner-approved overlay: `rpsgt-v3/core/owner-question-release.js`; original 2,920 bank records are held in `rpsgt-v3/data/question-bank/` and **320 owner-approved additions** enter by the existing overlay.
- Effective RPSGT question pool: 3,240 existing; 2,680 current learner-eligible and 560 held for quality review (previous full-bank audit).
- Seven new Guild library-backed proposals are **outside both V2 and V3 learner pools** (five first-pilot items plus two new gap candidates).

## One BRPT-led content policy, two implementation routes

1. **Scope:** Every proposed question identifies the BRPT current RPSGT Exam Blueprint task and uses Candidate Handbook requirements for format and policy. Neither exam reference is a clinical rule source.
2. **Library:** Start with the Guild master indexed workbook and BRPT-listed recommended textbooks: *Fundamentals of Sleep Technology* (3rd ed.), *Polysomnography for the Sleep Technologist*, *Pediatric Sleep Pearls*, *A Clinical Guide to Pediatric Sleep* (3rd ed.), and *Sleep Medicine Pearls* (3rd ed.). Resolve chapters/sections and verify supporting passages rather than assuming chapter headings support exact answers.
3. **Currentness:** Use applicable AASM/ICSD/AAST rules to verify scoring, diagnosis, treatment and technical procedure assertions; do not present modern rules as if an older textbook taught them.
4. **Duplicates and accuracy:** Compare existing 3,240 records and staged drafts, review equivalent skill decisions manually, require independent content review and then explicit owner approval.
5. **Copyright:** Create original question stems and explanations, not publisher end-of-chapter tests, ECG/PSG figures or copied proprietary case studies.
6. **Learner citations:** Display proper APA references only, never internal terms like "mapped reference", source IDs, audit labels or verification flags.

## What is already changed in the development branch

| Surface | File | Change | Validation |
|---|---|---|---|
| V2 | `scripts/public-question-release-v2.mjs` | Reject imported records lacking explicit owner approval or flagged held/excluded/proposed | `scripts/public-question-release-v2-test.mjs` |
| V3 | `rpsgt-v3/core/owner-question-release.js` | Reject held/excluded/proposed records in owner-release validation | `rpsgt-v3/scripts/test-owner-question-release.mjs` |
| Both / source staging | `rpsgt-v3/data/question-proposals/` | Seven unreleased draft IDs now carry blueprint, handbook and indexed BRPT-recommended textbook chapter metadata | Complete-bank proposal audits and separate linked book-section readback |
| Source policy | `rpsgt-v3/data/question-proposals/BRPT-LIBRARY-FIRST-EDITORIAL-STANDARD-2026-10-12.md` | Explicit library-first source hierarchy and APA-only learner display requirement | Editorial check |

The [combined owner-release CI validation](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38334311013) passed at head `0ceb18fb58c901156d696a82e357605699d2ee6c`, verifying V2 release behavior and V3 existing-bank integrity, including new negative hold tests. Revalidate after later commits.

## Next paired changes (after content audit and explicit release approval)

| Work item | V2 application change | V3 application change | Required gate |
|---|---|---|---|
| Correction to an existing question | Modify only the approved replacement/new revision through the controlled V2 question-release process; preserve old IDs for progress | Update owner-release overlay or controlled question modules with matching provenance/revision semantics; repair any corresponding remediation | Exact answer/source review, duplicate audit, owner release |
| New question | Controlled addition into canonical V2 `app-data` seed through importer, never hand-edit a 12 MB blob | Controlled owner-approved overlay ingestion into study/practice/review/readiness and, when eligible, mock | Independently verified textbook + governing rule, clinical QA, practice/mock selection tests |
| Flashcards and study explanations | Correct cited facts and APA presentations without disrupting storage or V2 navigation | Align mapped card/explanation content in `rpsgt-v3/core/flashcards.js`, study and resource catalog | Current source verification, no internal metadata displayed |
| Reports and readiness | Preserve existing historical results/storage; migrate only explicitly reviewed interpretations | Preserve modular reports and question analytics; link domain/task remediation to verified Guild source chapters | Deterministic regression and representative migration data |
| Front end, labs and UX | Only surgical safe changes; verify laptop/tablet/mobile interactions and accessibility before deployment | CPSGT-style focused navigation with Coach Bob, original PSG/ECG assets, responsive labs | Screenshots/browser regression, no copied book visuals |

## Protected invariants

- No unreviewed or merely staged question enters any learner practice, flashcard, readiness or mock pool.
- Do not change the published V2 HTML or its deployed routing as part of editorial review.
- Preserve the 175-question BRPT mock exam blueprint allocation currently accepted by the Guild; do not silently rebalance domains.
- Never overwrite existing learner IDs or saved-progress keys; use explicit migration/revision rules.
- Do not infer live deployment from passing branch CI.
- V3 public promotion remains separately gated by the release-readiness record and real-device/browser validation.

## Outstanding issues

- Seven candidates require qualified clinical/editorial review, statement-level source checking where claimed and human semantic de-duplication.
- Library-first metadata validator has been staged at `rpsgt-v3/scripts/test-rpsgt-library-first-proposals-2026.mjs`, but not yet incorporated into existing Actions. The direct repository metadata check passed 7/7; that does not equal CI execution of the new script.
- Scoring-sensitive pediatric candidate needs licensed current AASM scoring-manual review.
- Retained v2 monolithic app is still the public target; v3 is development-only pending its own release checklist.


## October 12 follow-on: direct BRPT-textbook reading and paired MSLT correction queue

**Verified from original user-supplied textbook PDFs (not internet-derived):**
- FST3, Chapter 19, split PDF volume 2, local PDF page 14: possible RLS augmentation can present with earlier symptom onset and spread during long-term dopaminergic use. The same historical paragraph calls dopamine agonists first-line; that **outdated treatment preference cannot be taught as current** and requires the Guild-indexed AASM 2025 guideline.
- FST3, Chapter 44, split PDF volume 3, local PDF page 185: a negative HSAT has lower negative predictive value with high pretest probability and requires PSG consideration with persistent clinical suspicion; adult testing pathway remains clinician-directed under the indexed 2017 AASM diagnostic guideline.
- FST3, Chapter 43, split PDF volume 3, local PDF pages 159–162: MSLT/SOREMP interpretation needs appropriate prior PSG and clinical context; older source descriptions must not be substituted for the current adult protocol.

**New reversible development controls:**
- `rpsgt-v3/scripts/test-rpsgt-library-first-proposals-2026.mjs` is now executed in the existing unreleased-proposal GitHub Action (the former unattended-library-test gap is closed).
- `rpsgt-v3/scripts/audit-rpsgt-v2-v3-source-currency.mjs` screens the shared **3,240-question effective bank** for exact wording patterns related to old RLS first-line treatment, wrong RLS/PLMD diagnosis, false-negative HSAT assurance, overconfident MSLT/narcolepsy diagnoses and related families. The first completed run returned **zero literal matches**, **not zero concept risks**. No existing learner item is changed automatically.
- `rpsgt-v3/data/question-proposals/mslt-v2-v3-existing-item-revisions-2026-10-12.json` stages ID-preserving proposed rationale and exact `aasm-adult-mslt-mwt-2021` citation-key improvements for current D2B IDs **imp-051** and **grow-041**. Their correct answers are deliberately unchanged; these two revisions are **not approved or deployed**.
- `rpsgt-v3/scripts/test-rpsgt-cross-version-mslt-revisions.mjs` reads V2 canonical `app-data`, V3 D2B source and the proposed revisions, ensuring the original IDs, text, answers and release holds remain intact before independent clinical/editorial approval.

All source page locators here refer to specific split-PDF **volume pages**, not printed textbook pages. Clinical wording remains pending qualified review. The earlier seven fully new original cases remain held separately.


## October 12 pediatric D3B + pediatric MSLT follow-on

**Guild-indexed BRPT sources used:** FST3 Ch. 61 local split PDF volume 4 pp. 35–40, *Pediatric Sleep Pearls* sections 2–3/7 (indexed), *A Clinical Guide to Pediatric Sleep* chapters 4/17 (indexed), current AASM Scoring Manual v3 reference record, and the **directly read** Maski et al. (2024) pediatric MSLT PDF Box 2 Item 2 (PDF page 4).

- **Five confirmed duplicates in eligible original D3B source:** `v1264-0161` through `-0165` have identical prompt, four options, answer and rationale. Propose maintaining a canonical item and reviewing four for controlled owner-approved retirement/replacement; current learner bank unmodified.
- **Diagnosis-versus-scoring clarification (important correction):** `mb-pediatric-mixed-4` concerns an **ICSD-3-TR pediatric OSA obstructive-hypoventilation diagnostic pattern**, which the user-provided **2023 ICSD-3-TR supplemental correction sheet, local PDF p. 3, specifies as *at least* 25%** with hypercapnia and obstructive features. FST3 Ch. 61 local PDF p. 40 instead reproduces an older AASM Version 2.5 standalone **pediatric PSG hypoventilation scoring** rule of *more than* 25%. Do **not** replace the existing answer. Stage only a clearer diagnosis-specific prompt/rationale; separately verify current scoring-only items against licensed AASM Version 3.
- **Precision reviews:** `imp-050` pediatric hypopnea explanation lacks event-duration context; `boost-039` pediatric short central-apnea scenario lacks two-missed-breath detail. `boost-039`, `src32-026`, and `case-d3-010` also test essentially the same case decision.
- **2024 pediatric MSLT direct authority:** For held `SPG-SPRIGGS-2026-005`, Box 2 Item 2 confirms preceding PSG ≥8 hours in bed, ≥7 hours sleep, and avoiding MSLT after PAP pressure changes.

Development assets:
- [Pediatric D3B review proposal](../rpsgt-v3/data/question-proposals/pediatric-v2-v3-repair-review-2026-10-12.json)
- [Evidence and editorial disposition ledger](../rpsgt-v3/data/question-proposals/REVIEW-pediatric-v2-v3-2026-10-12.md)
- [Cross-version held-revision validation script](../rpsgt-v3/scripts/test-rpsgt-pediatric-cross-version-review-2026.mjs)

**No original V2/V3 question records altered.** All changes are review notes, metadata, and regression tests; future actual content/release edits need qualified clinical scoring review plus explicit owner approval and saved-progress compatibility testing.

## October 12 source-difference safeguard

The uploaded `333828895-Sleep-Stage-Scoring-c3-version.pdf` is a 2015 presentation that cites AASM Scoring Manual Version **2.1**, **not Version 3**. It is historical training material. Neither this deck nor the BRPT-recommended textbook's Version 2.5 table can authorize current AASM Version 3 scoring thresholds. The 2023 **ICSD-3-TR supplemental corrections** directly establish the pediatric OSA obstructive-pattern diagnostic cutoff, *not* the separate PSG-scoring rule. A new automated check blocks an attempted replacement of `mb-pediatric-mixed-4`'s diagnostic answer with the historical scoring threshold. No learner-bank edits were applied.


## October 12 cross-version exact/semantic deduplication — all 3,240 records audited

**Source audit:** `rpsgt-v3/scripts/audit-rpsgt-v2-v3-exact-duplicate-families-2026.mjs` read the effective V2 `app-data` and complete V3 modular bank plus 320 owner-approved additions. IDs, prompts, options, answers, rationales and task codes showed **zero V2/V3 mismatches**.

Three **literal five-copy families** were verified, all 15 source records currently learner-eligible: pediatric age-five scoring `v1264-0161`–`-0165` (D3B); adolescent age-sixteen scoring `v1264-0166`–`-0170` (D3A); adult age-sixty scoring `v1264-0171`–`-0175` (D3A). They contain **12 redundant copies**. Adolescent prompts must recognize AASM age/protocol context rather than assume automatic adult respiratory scoring; current licensed v3 manual review remains the content gate.

Three additional **same-stem but paraphrased-answer pairs** were examined in full (choices and rationales):
- `D1A-019` / `D1A-035`: integrate chart/order, interview and observed clinical needs.
- `D4A-018` / `D4A-028`: consider planned daytime PAP desensitization after inadequate routine acclimation.
- `D4C-009` / `D4C-018`: do not make oxygen decisions by SpO₂ alone without context.

**These three are semantic duplicates, NOT confirmed clinically contradictory answer keys.** They are three additional candidates for controlled consolidation, separate from the 12 literal copies. Neither the six-family grouping nor automated answer-string mismatches authorize correction of a clinical answer.

**Consolidation queue:** `rpsgt-v3/data/question-proposals/v2-v3-duplicate-consolidation-queue-2026-10-12.json` proposes retaining six canonical question IDs and examining **15 source copies** for future exclusion from new sessions, but **never deleting or reusing historical IDs**. Qualified review and explicit owner decision remain outstanding.

**Dry run validated:** `rpsgt-v3/scripts/test-rpsgt-v2-v3-duplicate-consolidation-queue-2026.mjs` simulated all 15 exclusions in memory across identical V2/V3 source identities and verified V3 Practice and mock selection. Practice eligibility moved **2,674 → 2,659** only in simulation; ten seeded V3 mock builds retained **175 unique questions, 150 scored/25 pretest, unchanged domain quotas, no repeated mock families**. CI [38339019404](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38339019404) passed. This **does not** validate the actual V2 browser session, legacy progress history/report lookup or storage migration, which are future pre-release gates.

The original `RPSGTv2.2026.html`, all V3 source-bank modules/manifest, and `data/owner-approved-question-release.json` are untouched. No questions have been retired or added to learner pools.
