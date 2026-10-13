# Sleep Pathways Guild RPSGT V3 — Library-first Question Development Standard
*2026-10-12 • Draft editorial policy for proposed content only*

## Scope and purpose

Do not select an RPSGT learning objective simply because a newer online guideline was found or because a generic topical question is easy to generate. Start with the Guild's indexed **BRPT RPSGT Exam Blueprint**, **RPSGT Candidate Handbook**, **BRPT recommended reading list**, and its indexed books/articles. Search the existing effective question bank before proposing another test item.

The BRPT blueprint and candidate handbook are **exam-specification authorities**, not clinical answer keys. Books supply the main foundational and applied learning structure, while the **applicable current AASM scoring manual, clinical guidance, ICSD classification and AAST technical guideline** verify claims when a clinical/scoring standard has changed or a book is outdated.

## Order of operations for each new question

1. **Exam scope:** Locate a specific `D1A`–`D4C` task and educational decision in the indexed BRPT Blueprint. Reject off-blueprint trivia.
2. **Candidate handbook:** Check exam style, appropriate cognitive difficulty, single-best-answer formatting and authoritativeness of recommended references. Do not use the handbook as a clinical rule source.
3. **BRPT recommended book:** Select one or more relevant *actual Guild-indexed chapter IDs* and preserve book identity, title, edition, APA citation, chapter title, and locator status. Prefer task-matching chapters and read actual source passages before claiming a passage supports an answer.
4. **Guild articles and complementary books:** Use indexed topic maps and direct source reading for nuance and newer supporting data. Spriggs 2015 is *supplementary instructional organization*, **not identified as a current BRPT-listed textbook in this workbook**; Spriggs 2002 is historical.
5. **Current-answer check:** Determine which AASM, AAST, ICSD or other current source controls a scoring, procedural, treatment or diagnostic assertion. Do not silently substitute new rules as if they appeared in an older textbook. Document the historical/current difference and the publication status of the source.
6. **Bank audit:** Compare with all 3,240 existing effective bank records and other held drafts, review topic-family decisions manually, reject duplications and unbalanced/implausible distractors.
7. **Release gate:** Keep `qa.manualReviewRecommended=true` and `publicationStatus=proposed-not-learner-eligible` until clinical QA, copyrighted passage-use checks, and owner release approval. Never copy textbook review questions or book figures.

## Indexed BRPT recommended textbook families (Guild catalog, not independently refreshed here)

| Book | Catalog source key | Best routing use |
|---|---|---|
| *Fundamentals of Sleep Technology* (3rd ed.) | `fundamentals-sleep-technology-3e` | Primary broad technical and clinical backbone |
| *Polysomnography for the Sleep Technologist* | `polysomnography-sleep-technologist-2014` | Acquisition, instrumentation, hookup, safety, artifact, reporting |
| *Pediatric Sleep Pearls* | `pediatric-sleep-pearls-1e` | Pediatric reasoning, PSG, hypersomnolence, artifacts |
| *A Clinical Guide to Pediatric Sleep* (3rd ed.) | `clinical-guide-pediatric-sleep-3e` | Pediatric interview, differential, family education |
| *Sleep Medicine Pearls* (3rd ed.) | `sleep-medicine-pearls-3e` | Integrated patient-case educational depth |

The Guild [October 7 BRPT v4 command-center workbook](https://docs.google.com/spreadsheets/d/11KL3BVbdQhIley-qx7vKp2zeWqrVBB58/edit) identifies and tracks these sources under the BRPT-listed textbook reading sequence. Official-scope source identities are in `rpsgt-v3/data/study-sources/brpt-blueprint.json`, `brpt-handbook.json`, and `brpt-refs.json`. The spreadsheet is an **index**, not a substitute for the full book or official current handbook.

### Seven staged examples now routed through the source index

| Draft ID | BRPT task | Recommended-reading chapter anchor | Clinical rule/currency overlay |
|---|---|---|---|
| SPG-SPRIGGS-2026-003 | D2A | FST3 Ch. 35: Recording the Biopotentials of Sleep | AAST standard PSG/technical signal correction |
| SPG-SPRIGGS-2026-005 | D2B | FST3 Ch. 43 MSLT/MWT; *Pediatric Sleep Pearls* section 7 | AASM pediatric MSLT 2024 |
| SPG-SPRIGGS-2026-006 | D2B | FST3 Ch. 43 MSLT/MWT | AASM adult MSLT 2021 |
| SPG-SPRIGGS-2026-008 | D3B | FST3 Chs. 60–61: Pediatric PSG/Scoring; *Pediatric Sleep Pearls* section 2 | AASM Scoring v3 age-dependent rules/FAQ |
| SPG-SPRIGGS-2026-009 | D3C | FST3 Ch. 42: PSG Report; Robertson et al. Ch. 9: PSG workflow | AAST PSG documentation guideline |
| SPG-GAP-2026-001 | D1A | FST3 Ch. 19: RLS and PLMD | Current AASM RLS/PLMD 2025 guideline |
| SPG-GAP-2026-002 | D2B | FST3 Ch. 44: HSAT | AASM adult diagnostic testing guideline 2017 |

The FST3 **chapter titles, introductions and learning-objective scopes** for Ch. 19, 35, 42, 43, 44, 60 and 61 were checked against the user-provided local *Fundamentalssleep(1)–(4).PDF* library files; that check confirms chapter-topic fit, **not the exact correctness of new guideline-dependent answer claims**. Additional books are currently corroborated by indexed chapter maps, not passage-level rechecks. Existing QA gate remains active for all seven drafts.

## Learner-facing citation policy

Show only properly formatted APA references where references appear. Do **not** display raw `referenceKeys`, source routing labels, `mapped reference`, audit status, local PDF filenames, Google Drive mapping spreadsheets, or internal review instructions in the learner interface.

## Required automation

`rpsgt-v3/scripts/test-rpsgt-library-first-proposals-2026.mjs` checks that all seven draft items carry BRPT task, candidate handbook, recommended-reading list and task-matching Guild book section identity. This test is a **metadata gate**; it does not verify the copyright status of quoted source text or an answer's clinical validity. The test must be executed and passing in CI before claiming the library-first rule is automated. Existing clinical-duplicate tests remain separate.

## Non-merge promise

These are draft-only metadata/content changes in PR #135. The canonical 2,920-source question-bank manifest, existing 320 owner-approved additions, and V2/live learner pools remain untouched.
