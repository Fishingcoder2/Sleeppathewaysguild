# BRPT RPSGT reference reading outlines and question map

This directory contains copyright-safe reading outlines for the four RPSGT reference books currently identified in the Sleep Pathways Guild Drive catalog:

- *Fundamentals of Sleep Technology* (3rd ed.)
- *Polysomnography for the Sleep Technologist*
- *A Clinical Guide to Pediatric Sleep* (3rd ed.)
- *Sleep Medicine Pearls* (2nd ed. Drive copy)

Each source file stores APA 7 bibliographic metadata, the complete chapter or Fundamentals-section outline, original SPG study-routing notes, and RPSGT task codes. It does not reproduce textbook prose, figures, tables, algorithms, patient cases, or book questions.

`brpt-reference-question-map-summary.json` records reproducible source-key/task counts and question-ID checksums for the preserved 2,887-question bank. The full exact question-ID map is maintained in the linked Google Sheets audit workbook named **Sleep Pathways Guild — BRPT RPSGT Reference Reading Outlines & Question Map — 2026-08-05**.

## RPSGT domain and task control

All learner-facing mapping uses the four RPSGT domains and 12 official tasks preserved in `rpsgt-v3/data/blueprint.json`:

- **Domain 1 — Clinical Overview, Education, Patient Support:** D1A Patient information and clinical assessment; D1B Patient and caregiver education; D1C Provide therapy support.
- **Domain 2 — Sleep Study Preparation and Performance:** D2A Determine technical preparation; D2B Perform procedures and follow practice guidelines; D2C Identify, respond, and document.
- **Domain 3 — Scoring, Reporting, and Data Verification:** D3A Score adult studies; D3B Score pediatric and infant studies; D3C Generate and verify report.
- **Domain 4 — Treatment and Intervention:** D4A Administer PAP therapy; D4B Identify alternative therapies; D4C Administer oxygen therapy.

`D2A/D2C` is **not** an official RPSGT task. It is retained only for five isolated Quality Review records and must never be presented as a thirteenth learner-facing task.

## Mapping boundary

A question is associated with a book only when one of that book's configured source keys occurs in the question's `referenceKeys` or `studyRecommendationKeys`; matches are grouped by the preserved RPSGT `taskCode`. Chapter-to-task routing is a reading plan, not a page-level provenance claim. Rule-sensitive material, especially from older editions, must still be checked against current official AASM scoring guidance, current ICSD terminology, and the current BRPT blueprint/reference list before release approval.

## Historical audit totals (August 5, 2026; 2,887-question bank)

- *Fundamentals of Sleep Technology*: 76 chapters, 17 appendices, 2,805 source-key-matched questions
- *Polysomnography for the Sleep Technologist*: 14 chapters, 593 matched questions
- *A Clinical Guide to Pediatric Sleep*: 23 chapters, 373 matched questions
- *Sleep Medicine Pearls* (2nd ed.): 22 Fundamentals sections, 85 historical key-matched questions
- Total source-question matches: 3,856; overlaps between books are expected

## November 21, 2026 edition correction

The third-edition e-book (ISBN 9780323319713) has 41 Fundamentals sections and three appendices. The publisher retail page displays a conflicting 22-section outline that closely matches the second edition. Use the edition-specific e-book contents with original topic labels for discovery only. Do not transfer historical question keys or page locators to the third edition. Full passage-level validation and a refreshed current-bank question map remain pending. See `sleep-medicine-pearls-3e.json` for evidence URLs and edition boundaries.

## Page-level citation workflow (November 21, 2026)

See [`../../docs/question-page-citation-audit.md`](../../docs/question-page-citation-audit.md) for the exact-edition citation and page audit. The new `question-page-evidence.schema.json` and `question-page-evidence.json` define a separate reviewed question-to-passage layer; there are **no approved pinpoint page citations yet**. The `test-question-page-evidence.mjs` guard checks edition identity, 1-based printed/PDF pages, source/question existence, verification details, and the exclusion of outline-only material from answer claims.

The Reference Center can display the existing directly verified *printed chapter-start* locator set for *Principles and Practice of Sleep Medicine*, clearly labeled as reading navigation, not proof of an answer. Digital-copy page ranges already recorded in pediatric reading sections remain explicitly labeled as local PDF positions. Pages must never be inferred from adjacent chapter starts, copied between editions, or presented as question-level evidence without manual passage review.

**Do not conflate question bank snapshots.** The 2,887-question August 5 reading map, the 2,920-question development extraction, and later 3,240-question release history are distinct. Reconcile the current served bank before filling the new evidence register.
