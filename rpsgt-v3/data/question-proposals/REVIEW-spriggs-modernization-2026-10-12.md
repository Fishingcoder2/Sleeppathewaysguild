# Spriggs modernization — clinical and editorial evidence ledger

> **Current owner policy (October 13, 2026):** The Guild creator and owner, an RPSGT with pediatric badge certificate, is the designated sole clinical-content reviewer. The owner personally approved the seven revised final drafts (five Spriggs, two gap); a second independent reviewer is **not** required. This owner approval does not activate them for learners: applicable licensed AASM rule verification, human semantic-family disposition, and representative V2/V3 saved learner history/report regression remain. See `CLINICAL-REVIEW-POLICY.md`, `OWNER-CLINICAL-ITEM-APPROVAL-2026-10-13.json` and PR #140. The historical October 12 status descriptions below are retained as development history and are superseded on clinical signoff.

Date: October 12, 2026

**Status: FIVE STAGED QUESTIONS — NOT CLINICALLY APPROVED; NOT RELEASED**

This is a question-development and source-review record. It is not a substitute for qualified clinical peer review. No prospective question is learner eligible.

## Documented source identity and editorial use

1. Spriggs, W. H. (2015), *Essentials of Polysomnography* (2nd ed.) is used for **indexed chapter/topic seeds**, not current scoring or clinical rules. Its chapter and page mappings were checked against the existing [2015 Guild spreadsheet](https://docs.google.com/spreadsheets/d/111Es2ZAyBvf94LlRe3iuCWmZLEaXJ_79/edit); chapter coverage does **not** prove a precise textbook passage supports a question.
2. Spriggs, W. H. (2002), *Principles of Polysomnography*, is **historical context only**, cross-checked at chapter level against the [2002 Guild spreadsheet](https://docs.google.com/spreadsheets/d/1IyL0iI-QFNHU5zgB__zm_rJSDR0Q1sMU/edit). Outdated R&K terminology, older protocols and book practice-exam material cannot control answers.
3. Current procedural/scoring authority comes from the published AAST technical guideline, AASM adult/pediatric MSLT protocols, and AASM Scoring Manual Version 3 + erratum/FAQ, depending on the item.
4. The library has the 2024 pediatric MSLT article and the current ICSD-3-TR summary; it does not establish possession of the *full licensed* Scoring Manual v3 or complete ICSD-3-TR. Do not claim full rule/passage verification without appropriate access.

## Five remaining questions

| ID | Task | Educational decision | 2015 Spriggs chapter and printed pages | Current controlling evidence | Editorial status |
| --- | --- | --- | --- | --- | --- |
| 003 | D2A | A single EOG channel fails eye-movement calibration; inspect and restore that acquisition path before lights out | Chapter 6, *Patient Hookup Procedures*, pp. 65–81 | AAST *Standard Polysomnography* (2021), §2.2.3 Physiological Calibration (PDF page 13); AASM v3 technical specifications | Retain provisionally; instrument-choice plausibility and overlap with lower-extremity calibration item require human review |
| 005 | D2B | A 12-year-old has 8 h in bed but only 6 h 20 min sleep before MSLT; flag inadequate preceding sleep | Chapter 11, *Performing Other Types of Sleep Studies*, pp. 153–156 | Maski et al. (2024), Box 2, item 2: pediatric MSLT requires at least 8 h in bed and 7 h total sleep | Retain provisionally; current procedural evidence directly checked |
| 006 | D2B | Adult MSLT scheduled after split-night PAP pressure adjustment; do not treat the preceding PSG as a qualifying MSLT baseline | Chapter 11, *Performing Other Types of Sleep Studies*, pp. 153–156 | Krahn et al. (2021), Box 2: adult MSLT is not performed after split-night or PAP-adjustment night | Retain provisionally; current procedural evidence directly checked |
| 008 | D3B | Nine-year-old was scored by adult respiratory software defaults; review with pediatric criteria and correct the scoring | Chapter 16, *Pediatric Sleep Medicine*, pp. 234–237 | Current AASM Version 3 scoring FAQ: optional adult respiratory criteria apply beginning at 13 years, not at 9 | Retain as rule-sensitive HOLD; needs licensed AASM manual verification |
| 009 | D3C | Document nasal-pressure channel loss 02:10–03:00, technical intervention and scoring limitation | **Chapter 15, *Scoring and Reporting*, pp. 225–233** | AAST *Standard Polysomnography* (2021), §§3.3.1–3.3.2, chronological technical log and report summary | Retain provisionally; rule-safe as documentation rather than scoring reinterpretation |

**Important correction:** The first draft assigned item 009 to Spriggs (2015) Chapter 14, *Cardiac Rhythms* (pp. 214–224). The indexed topic and chapter audit correctly reassigns it to Chapter 15, *Scoring and Reporting* (pp. 225–233). Historic Spriggs 2002 Chapter 6 (pp. 361–408) remains a noncontrolling supplemental pointer.

### Known overlap risks and discarded questions

A pilot of 16 concepts was narrowed to 10 (first six retired), then 8 (two more retired after full-bank scan), then **5** (three additional editorial decisions).

- The 16-to-10 transition **renumbered** survivor IDs once. The staged proposal JSON now records the origin-to-survivor lookup. A retired ID from the original 16 must not be treated as equivalent to the same suffix in the later 10/8/5 set.
- In the 10-to-8 phase, the general PSG sensor explanation was retired as duplicative of D1B-011 and the repositioning/flat respiratory channel case as duplicative of D2C-019.
- In the 8-to-5 phase, draft 001 was retired for shift-work-intake overlap with D1A-018 and weak distractors; 004 for superficial 10–20 landmark recall in a crowded D2A family; and 010 for poor-pleth artifact overlap with RPSGT-B5-S067.
- The other six concept-level retirements from the original 16, including mask anxiety, EOG muscle artifact and oximeter troubleshooting, are individually preserved with stage-qualified IDs in the JSON.

### Full-bank test results and limitation

The Oct 12 [GitHub Actions audit run 38326654883](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38326654883) successfully checked the **2,920 original + 320 owner-added = 3,240 effective RPSGT questions**, with zero hard validation failures. Its weighted-word-overlap screen produced no high threshold flags in the then-eight drafts; manual review nevertheless eliminated three additional concepts. The updated CI should be rerun against the final five records.

This test does not confirm absence of all semantic near-duplicates, accuracy of a clinician's best-choice reasoning or the latest full text of a licensed rule source.

## Release gate: all five continue to fail clinical publication eligibility

- [x] Current AASM/AAST source identity recorded and source-key map resolved
- [x] Spriggs textbook **chapter titles and ranges** checked against indexed maps
- [x] Adult and pediatric MSLT protocol wording independently checked
- [x] Clear pediatric respiratory age applied
- [x] Corrected Chapter 15 for reporting
- [x] Unreleased status confirmed on every prospective item
- [ ] Statement-level confirmation in relevant Spriggs textbook passages, if citation claims require it
- [ ] Independent RPSGT/sleep physician/educator content review
- [ ] Licensed AASM scoring manual manual/FAQ rule confirmation for item 008
- [ ] Dedicated topic-family human semantic duplicate audit
- [ ] Explicit owner authorization for a new content release

## APA 7 source references

American Academy of Sleep Medicine. (2023). *The AASM manual for the scoring of sleep and associated events: Rules, terminology and technical specifications* (Version 3). https://aasm.org/clinical-resources/scoring-manual/

American Association of Sleep Technologists. (2021). *Standard polysomnography* [Technical guideline]. https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf

Board of Registered Polysomnographic Technologists. (n.d.). *RPSGT exam blueprint*. https://brpt.org/rpsgt/exam-blueprint/

Krahn, L. E., Arand, D. L., Avidan, A. Y., Davila, D. G., DeBassio, W. A., Ruoff, C. M., & Harrod, C. G. (2021). Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in adults: Guidance from the American Academy of Sleep Medicine. *Journal of Clinical Sleep Medicine, 17*(12), 2489–2498. https://doi.org/10.5664/jcsm.9620

Maski, K. P., Amos, L. B., Carter, J. C., Koch, E. E., Kazmi, U., & Rosen, C. L. (2024). Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in children: Guidance from the American Academy of Sleep Medicine. *Journal of Clinical Sleep Medicine, 20*(4), 631–641. https://doi.org/10.5664/jcsm.10974

Spriggs, W. H. (2002). *Principles of polysomnography: A complete training program for sleep technicians*. Sleep Ed, LLC.

Spriggs, W. H. (2015). *Essentials of polysomnography: A training guide and reference for sleep technicians* (2nd ed.). Jones & Bartlett Learning.
