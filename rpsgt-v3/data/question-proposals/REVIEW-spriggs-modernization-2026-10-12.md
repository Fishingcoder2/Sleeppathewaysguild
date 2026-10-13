# Spriggs modernization — candidate clinical/editorial review ledger
Date: 2026-10-12
Status: **Internal quality review only; not a learner-facing item bank or owner-authorized release**

## Methods and boundaries
The first 16 original case-based drafts were based on the **topic maps** (not copied questions) for Spriggs (2015) and the historical Spriggs (2002), then modernized against current rules. Six cases were removed after preliminary comparisons; two additional concepts were removed after full-bank CI. The current eight still need human clinical review and any required access to the licensed AASM Scoring Manual.

On Oct 12, the full-bank GitHub Actions run [38326465399](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38326465399) parsed all 3,240 existing RPSGT records and returned **zero hard errors and zero token-similarity alerts**. Its similarity threshold is a triage heuristic: it does not establish concept uniqueness or medical accuracy. Reviewer decisions below are separate from automated checks.

## Remaining candidates

| ID | Concept & BRPT task | Current-evidence check | Editorial recommendation |
| --- | --- | --- | --- |
| 001 | Shift schedules and inadequate sleep before hypersomnolence attribution — D1A | Appropriate intake framework; ICSD-3-TR classification and adult clinical protocol remain relevant. | Hold: verify diagnostic/assessment authority; compare against existing shift-work assessment question D1A-018 to ensure distinct decision. |
| 003 | Flat EOG during voluntary calibration — D2A | Standard signal-integrity response consistent with AAST adult PSG / AASM technical guidance. | Hold: verify montage-related language; nearby bank D2A/D2C question uses a flat tibialis channel during leg-movement calibration. |
| 004 | Reproducible electrode placement using 10–20 measurements — D2A | Foundations align with current montage concepts; numeric claims intentionally omitted. | Hold: assess whether recall is too easy/redundant against existing 10–20 items; consider replacing with more discriminating applied placement case. |
| 005 | 12-year-old MSLT PSG sleep time only 6 h 20 min — D2B | **Protocol evidence independently verified:** Maski et al. (2024), Box 2: at least 8 h time in bed and 7 h total sleep for pediatric MSLT. | Strong retain candidate; clinician/facility decision emphasized rather than automatic test cancellation. |
| 006 | Adult MSLT after split-night PAP adjustments — D2B | **Protocol evidence independently verified:** Krahn et al. (2021), Box 2 prohibits MSLT after split-night/initial PAP titration. | Strong retain candidate; retain adult/pediatric separation. |
| 008 | Nine-year-old scored under adult template — D3B | **Current AASM FAQ supports:** adult respiratory scoring optionally begins at age 13, not age 9. | Strong concept; verify against licensed AASM v3 pediatric rules and avoid exposing proprietary wording. |
| 009 | Technical report documenting periods of respiratory sensor loss — D3C | General technical-adequacy/documentation principles supported by AAST adult PSG. | Hold: ensure answer tests temporal limitation and handoff rather than repeats a generic report-completeness question. |
| 010 | Poor oximetry pleth during apparent desaturations — D3A | AASM scoring manual governs scoring; signal quality must be assessed before respiratory event interpretation. | Hold: cross-domain concept-family comparison with existing D2C poor-pleth artifact question; consider a distinct scorer-specific case or retire. |

## Retired concepts

- Initial six: PAP anxiety, kinked ETCO2 line, jaw-clenching muscle artifact, PAP eye leak, oral appliance referral, poor-pleth SpO2 troubleshooting (respective existing-bank IDs in proposal duplicateAudit).
- Additional two from full-bank manual inspection: 002 general PSG sensor explanation ↔ D1B-011; 007 flat respiratory trace following repositioning ↔ D2C-019.

## Authority order and source limitation

1. BRPT RPSGT Exam Blueprint/Candidate Handbook — task fit and exam format.
2. Current official AASM Scoring Manual v3, erratum and FAQ — sleep scoring/technical rule-sensitive cases.
3. Relevant AASM published protocols, AAST procedures, ICSD-3-TR diagnostic taxonomy, orders, device instructions and applicable policies.
4. BRPT-recommended books and indexed Spriggs chapters as secondary study guidance.

The project has chapter maps for Spriggs (2015, 2002), but this review does **not** establish statement-by-statement page verification. The library's full *ICSD-3-TR* licensed text has not been independently confirmed; the indexed supplemental change material is not a substitute.

## APA 7 working references

American Academy of Sleep Medicine. (2023). *The AASM manual for the scoring of sleep and associated events: Rules, terminology and technical specifications* (Version 3). https://aasm.org/clinical-resources/scoring-manual/

American Association of Sleep Technologists. (2021). *Standard polysomnography* [Technical guideline]. https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf

Board of Registered Polysomnographic Technologists. (n.d.). *RPSGT exam blueprint*. https://brpt.org/rpsgt/exam-blueprint/

Krahn, L. E., Arand, D. L., & Avidan, A. Y. (2021). Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in adults: Guidance from the American Academy of Sleep Medicine. *Journal of Clinical Sleep Medicine, 17*(12), 2489–2498. https://doi.org/10.5664/jcsm.9620

Maski, K. P., Amos, L. B., Carter, J. C., Koch, E. E., Kazmi, U., & Rosen, C. L. (2024). Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in children: Guidance from the American Academy of Sleep Medicine. *Journal of Clinical Sleep Medicine, 20*(4), 631–641. https://doi.org/10.5664/jcsm.10974

Spriggs, W. H. (2002). *Principles of polysomnography: A complete training program for sleep technicians*. Sleep Ed, LLC.

Spriggs, W. H. (2015). *Essentials of polysomnography: A training guide and reference for sleep technicians* (2nd ed.). Jones & Bartlett Learning.
