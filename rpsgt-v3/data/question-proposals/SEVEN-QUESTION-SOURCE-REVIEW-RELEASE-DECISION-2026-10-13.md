# Sleep Pathways Guild — seven-item source review and learner publication decision

**Reviewed:** October 13, 2026. **GitHub evidence:** draft PR #140 head `e7c432de65aeaeb1a1522bf6d4ca1e555c320a17` before this audit-only addition.  
**Result: 7 concept checks performed; 0 published.** This is **AI-assisted clinical-source/editorial review**, **not qualified independent professional clinical signoff**.

## Item-by-item source and answer decision

| Draft ID | Source cross-check and keyed-answer assessment | Remaining issue |
| --- | --- | --- |
| `SPG-SPRIGGS-2026-003` | AAST *Standard Polysomnography* (2021), §§2.1.1.3 and 2.2.3: check electrodes, impedances and signal quality; correct compromised EOG response and repeat/annotate calibration. Correct choice supported. | Similar general calibration repair decision to `RPSGT-MOCK-D2-051` (flat tibialis); independent family-novelty review and clinical signoff pending. |
| `SPG-SPRIGGS-2026-005` | Maski et al. (2024), Box 2(2), user PDF p.4: preceding PSG minimum **8 hours in bed AND 7 hours total sleep** for pediatric MSLT. The six-hour-twenty-minute case fails even if time in bed was eight hours. Escalation/protocol choice supported. | Human semantic family review and qualified clinical signoff pending. |
| `SPG-SPRIGGS-2026-006` | Krahn et al. (2021), Box 2(1): **do not conduct adult MSLT after PAP pressures were adjusted**, including split night. Six hours TST or prior scheduling does not override the exclusion. Correct choice supported. | Human semantic family review and qualified clinical signoff pending. |
| `SPG-SPRIGGS-2026-008` | Public AASM Scoring Manual Version 3 FAQ: optional adult respiratory criteria only at **13 years and older**; 9-year-old case correctly calls for age-appropriate pediatric re-scoring. The publicly available February 2024 V3 erratum concerns arousals and HSAT heart-rate reporting, not this age rule. | **HARD HOLD:** directly inspect complete licensed current AASM v3 pediatric respiratory rules and relevant updates; clinical + human semantic review also pending. |
| `SPG-SPRIGGS-2026-009` | AAST (2021), §§3.3.1–3.3.2: log technical difficulties and interventions chronologically and summarize limitations. Record nasal-pressure failure 02:10–03:00, correction and limitation. Correct choice supported. | Qualified clinical and independent semantic family review pending. |
| `SPG-GAP-2026-001` | *Fundamentals of Sleep Technology* (3rd ed.), split-volume 2 PDF p.14 and Winkelman et al. (2025): earlier onset, spread to arms and shorter symptom-onset latency on dopaminergic therapy support concern for augmentation. A technologist documents and alerts prescriber, not changes ropinirole or diagnoses PLMD. | Qualified clinical and independent semantic family review pending; do not follow superseded textbook first-line medication preferences. |
| `SPG-GAP-2026-002` | *Fundamentals of Sleep Technology* (3rd ed.), split-volume 3 PDF p.185 and Kapur et al. (2017), Recommendation 3: negative HSAT with continuing OSA suspicion warrants clinician-directed attended PSG. Correct choice supported. | Qualified clinical and independent semantic family review pending. |

## Repository/CI evidence

- [Revised proposal audit](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38347685778): succeeded; all 3,240 effective bank records inspected programmatically, **0 hard errors, 0 token-warning flags, 0 normalized exact prompt collisions** for seven. This alone is **not** exhaustive human semantic review.
- [Owner-release safeguards](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38347685715): succeeded; all seven held, all five existing revisions held and 15 duplicate retirements prohibited.
- [New seven-item preflight test](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38347685778): succeeded; IDs, BRPT task codes, existing keyed answers, 4 unique response choices, exact source fields and held flags checked.
- [V3 browser learner-flow job](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38347685808): **job succeeded** when inspected. This does **not** document a real same-origin V2/V3 saved-history export/replay, cross-version reports and full representative learner migration.
- [PR #140](https://github.com/Fishingcoder2/Sleeppathewaysguild/pull/140): no submitted independent professional review in GitHub at inspection time. This does not rule out off-GitHub review, but none was evidenced for release eligibility.
- Uploaded `333828895-Sleep-Stage-Scoring-c3-version.pdf` is a training deck with a 2015 creation date; it is **not** the licensed AASM Scoring Manual v3 (released February 2023).

## Publication safeguards

The owner previously conditionally authorized seven releases **only after** independent qualified clinical item review (each stem, keyed answer, three distractors, rationale), comprehensive semantic-family review, relevant licensed scoring verification, and actual saved-progress/history/report regression. These conditions remain unmet. **No source-only review can be represented as independent professional signoff.** Keep all seven draft proposals `proposed-not-learner-eligible`, all five existing revisions held, and all 15 duplicate-retirement candidates active. Do not alter the existing V2 public learner bank, V3 modules, approved question overlay, IDs, history or migration keys.

**Exact outcome of this review: seven source-supported concepts; zero independent qualified clinical signoffs documented; zero licensed scoring clearance for item 008; zero full real-history regression signoffs; zero newly published questions.** Do not promote directly from these proposal files into learner pools.

## Key source locators

- AAST (2021), *Standard polysomnography*, §§2.2.3, 3.3.1–3.3.2: https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf
- Maski et al. (2024), pediatric MSLT Box 2: https://pmc.ncbi.nlm.nih.gov/articles/PMC10985297/
- Krahn et al. (2021), adult MSLT Box 2: https://pmc.ncbi.nlm.nih.gov/articles/PMC8726366/
- Winkelman et al. (2025), RLS/PLMD guideline: https://pmc.ncbi.nlm.nih.gov/articles/PMC11701286/
- Kapur et al. (2017), adult OSA diagnostic guideline Recommendation 3: https://pmc.ncbi.nlm.nih.gov/articles/PMC5337595/
- AASM public V3 FAQ: https://learn.aasm.org/AssetListing/The-AASM-Manual-for-the-Scoring-of-Sleep-and-Associated-Events-Series-2-1455/Scoring-of-Sleep-and-Associated-Events-FAQs-6696
- AASM February 2024 V3 erratum: https://aasm.org/wp-content/uploads/2024/03/ScoringManual_3_Erratum_Document_3-1.pdf
