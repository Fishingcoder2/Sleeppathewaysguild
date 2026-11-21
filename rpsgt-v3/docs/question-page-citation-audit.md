# RPSGT V3: Edition-Specific Citation and Page Locator Audit

**Status:** audit infrastructure and navigation-only page locators; no newly approved question-level pages.  
**Owner boundary:** draft PR only; no question-bank edits, no learner-progress migration, no merge/deployment.

## Purpose and identity

A BRPT task match or keyword match **does not prove** that a source passage supports a question. For each answer/rationale link, review the actual source and exact edition. Always preserve stable question ID and separate bibliographic identity, topic discovery, answer support, and current-rule authority.

An APA 7 reference-list citation generally identifies the book/article, not an arbitrarily assigned page. Page/section locators belong in the learner's question-specific **“Where to review”** details once verified.

## Three different page coordinate systems

| Locator | Meaning | Learner label | Verification |
|---|---|---|---|
| Printed page | Page number printed in the actual edition | `print p. 1261` | Read the printed page marker in that edition |
| PDF viewer page | 1-based position within a particular verified digital file | `digital copy, PDF p. 15` | Check the exact PDF and its page offset; never assume equality with print |
| E-book location | Publisher/app-specific location, chapter or section | `e-book section: …` | Check the exact e-book edition; do not convert a Kindle location to print pages |
| Section only | Exact section heading without a verified page | `Chapter / section: …` | May guide reading, not prove the exact answer |

Number pages as **1-based** in the page evidence register. A range requires both ends to have been directly observed in the same numbering system. A recorded chapter *starting* page never implies that an entire chapter has been checked. Never derive page ranges from two adjacent chapter start pages.

## Existing navigational anchors (not question-level support)

- `principles-practice-sleep-medicine-7e.json` contains 25 *printed chapter start* locators recorded as directly verified from the Guild library copy. For example, Chapter 132, *Positive Airway Pressure Treatment for Obstructive Sleep Apnea*, starts at **printed page 1261**. These are navigational anchors only.
- `pediatric-sleep-pearls-1e.json` stores chapter-like thematic sections with 1-based digital-copy ranges; for example, **Pediatric polysomnography (digital copy, pp. 15–24)**. These are from the verified Guild file mapping, not automatically the printed edition's pages.
- `aasm-pediatric-mslt-mwt-2024.json` now records a **directly checked dual-pagination pilot** from the uploaded Maski et al. (2024) article (DOI 10.5664/jcsm.10974): printed journal **pp. 631–641** correspond to **PDF viewer pp. 1–11** of that specific uploaded 11-page file. This establishes article pagination only; individual question support has not been reviewed.
- `sleep-medicine-pearls-3e.json` contains 41 third-edition Fundamentals topics and 3 appendices, but **no approved page numbers or passage-level question mappings**. Do not copy the second edition's 22-section page structure or retail-table-of-contents labels.

Reference Center may display recorded chapter starting pages behind an expandable heading, with a disclaimer that they are **not verified answer locations**. It must not show a guessed page next to a question or an explanation.

## Approval gates for question-page links

Data contract: `data/study-sources/question-page-evidence.schema.json`  
Candidate register: `data/study-sources/question-page-evidence.json`  
Safety checks: `scripts/test-question-page-evidence.mjs`

For each question:

1. Match stable question ID and a **specific source ID and edition**. Confirm bibliographic author/year/edition/ISBN in the original source record.
2. Read the question's **correct answer and rationale**, then locate a supporting source passage—not merely a related heading.
3. Record exact locator type and starting/ending coordinate; explicitly note whether it supports **answer**, **rationale**, or **current rule**. Original concise evidence summaries only; never paste copyrighted textbook paragraphs.
4. Require direct exact-edition inspection, reviewer, review date and appropriate current-authority check. Rejected or pending records must not carry learner-visible page coordinates.
5. If a scoring, diagnosis, treatment or protocol rule has changed, verify against the applicable current professional authority. Do not cite a legacy book as governing current practice.
6. Where no specific passage is found, retain a **section-only reading suggestion**, not a false pinpoint citation. Questions with unsupported rationales go to editorial review, not automatic publish.

Only vetted `verified` evidence with `answer-support`, `rationale-support`, or `current-authority` role can eventually populate a question-level reference detail. `reading-navigation` is visibly different.

## Critical snapshot reconciliation before a full crosswalk

The development-only modular bank manifest `data/question-bank/manifest.json` identifies **2,920** preserved questions, extracted in August 2026. Later project work references a **3,240-question** release set. The older `brpt-reference-question-map-summary.json` counts **2,887** questions (August 5). These are different snapshots, not interchangeable proof that every currently served question is citation-verified.

The candidate page-evidence register is intentionally empty until the **actual released and/or current V3 bank** is selected, its question IDs compared against this 2,920 snapshot, and the published/review-state boundary is established. Never silently transfer a page link to an amended question with the same topic.

## First-pass audit order

1. Resolve the exact current served question-bank snapshot, stable IDs, counts, revisions, and approval state.
2. Prioritize AASM-scored rules, pediatric/infant rules, titration and oxygen, then clinical diagnostic definitions and later durable background topics.
3. Match each surviving question to at least one **directly verified** explanation-supporting source, and add an authority source where required.
4. Publish only independently reviewed references, keeping public APA style. Leave source keys, private Drive access, editor notes, and internal evidence paths out of learner-facing UI.
5. Run regression validation and perform a visual mobile/desktop check before any merge or deployment.

### Prohibitions

- No invented page numbers, automatic neighboring-page inference, or converting electronic positions to printed page numbers.
- No claiming that existing chapter-start anchors prove an answer.
- No copied proprietary paragraphs, publisher questions, or case contents.
- No automatic migration of second-edition `Sleep Medicine Pearls` locators to the third edition.
- No publication or merge solely because a structural test passed.
