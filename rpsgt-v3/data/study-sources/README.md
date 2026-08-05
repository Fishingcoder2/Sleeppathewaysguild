# BRPT reference reading outlines and question map

This directory contains copyright-safe reading outlines for the four RPSGT reference books currently identified in the Sleep Pathways Guild Drive catalog:

- *Fundamentals of Sleep Technology* (3rd ed.)
- *Polysomnography for the Sleep Technologist*
- *A Clinical Guide to Pediatric Sleep* (3rd ed.)
- *Sleep Medicine Pearls* (2nd ed. Drive copy)

Each source file stores APA 7 bibliographic metadata, the complete chapter or Fundamentals-section outline, original SPG study-routing notes, and RPSGT task codes. It does not reproduce textbook prose, figures, tables, algorithms, patient cases, or book questions.

`brpt-reference-question-map-summary.json` records reproducible source-key/task counts and question-ID checksums for the preserved 2,887-question bank. The full exact question-ID map is maintained in the linked Google Sheets audit workbook named **Sleep Pathways Guild — BRPT Reference Reading Outlines & RPSGT Question Map — 2026-08-05**.

## Mapping boundary

A question is associated with a book only when one of that book's configured source keys occurs in the question's `referenceKeys` or `studyRecommendationKeys`; matches are grouped by the preserved `taskCode`. Chapter-to-task routing is a reading plan, not a page-level provenance claim. Rule-sensitive material, especially from older editions, must still be checked against current official AASM scoring guidance, current ICSD terminology, and the current BRPT blueprint/reference list before release approval.

## Current audit totals

- *Fundamentals of Sleep Technology*: 76 chapters, 17 appendices, 2,805 source-key-matched questions
- *Polysomnography for the Sleep Technologist*: 14 chapters, 593 matched questions
- *A Clinical Guide to Pediatric Sleep*: 23 chapters, 373 matched questions
- *Sleep Medicine Pearls*: 22 Fundamentals sections, 85 matched questions
- Total source-question matches: 3,856; overlaps between books are expected
