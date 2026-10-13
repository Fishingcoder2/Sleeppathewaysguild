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
