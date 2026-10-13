# Sleep Pathways Guild — seven-item source review and learner publication decision

**Reviewed:** October 13, 2026. **GitHub evidence:** draft PR #140 head `e7c432de65aeaeb1a1522bf6d4ca1e555c320a17` before this audit-only addition.  
**Result: 7 source concept checks and separate owner RPSGT content approval recorded; 0 learner-published.** AI-assisted source analysis is not a clinician's review; the Guild owner's dated explicit per-item approval separately supplies the clinical review under the policy amended October 13, 2026. **No external second reviewer is needed.**

## Item-by-item source and answer decision

| Draft ID | Source cross-check and keyed-answer assessment | Remaining issue |
| --- | --- | --- |
| `SPG-SPRIGGS-2026-003` | AAST *Standard Polysomnography* (2021), §§2.1.1.3 and 2.2.3: check electrodes, impedances and signal quality; correct compromised EOG response and repeat/annotate calibration. Correct choice supported. | Similar general calibration repair decision to `RPSGT-MOCK-D2-051` (flat tibialis); human family-novelty decision pending; owner clinical signoff COMPLETE. |
| `SPG-SPRIGGS-2026-005` | Maski et al. (2024), Box 2(2), user PDF p.4: preceding PSG minimum **8 hours in bed AND 7 hours total sleep** for pediatric MSLT. The six-hour-twenty-minute case fails even if time in bed was eight hours. Escalation/protocol choice supported. | Human semantic family review pending; owner RPSGT signoff COMPLETE. |
| `SPG-SPRIGGS-2026-006` | Krahn et al. (2021), Box 2(1): **do not conduct adult MSLT after PAP pressures were adjusted**, including split night. Six hours TST or prior scheduling does not override the exclusion. Correct choice supported. | Human semantic family review pending; owner RPSGT signoff COMPLETE. |
| `SPG-SPRIGGS-2026-008` | Public AASM Scoring Manual Version 3 FAQ: optional adult respiratory criteria only at **13 years and older**; 9-year-old case correctly calls for age-appropriate pediatric re-scoring. The publicly available February 2024 V3 erratum concerns arousals and HSAT heart-rate reporting, not this age rule. | **HARD HOLD:** directly inspect complete licensed current AASM v3 pediatric respiratory rules and relevant updates; human semantic decision review pending; owner clinical signoff COMPLETE. |
| `SPG-SPRIGGS-2026-009` | AAST (2021), §§3.3.1–3.3.2: log technical difficulties and interventions chronologically and summarize limitations. Record nasal-pressure failure 02:10–03:00, correction and limitation. Correct choice supported. | Human semantic family review pending; owner clinical signoff COMPLETE. |
| `SPG-GAP-2026-001` | *Fundamentals of Sleep Technology* (3rd ed.), split-volume 2 PDF p.14 and Winkelman et al. (2025): earlier onset, spread to arms and shorter symptom-onset latency on dopaminergic therapy support concern for augmentation. A technologist documents and alerts prescriber, not changes ropinirole or diagnoses PLMD. | Human semantic family review pending; owner clinical signoff COMPLETE; do not follow superseded textbook first-line medication preferences. |
| `SPG-GAP-2026-002` | *Fundamentals of Sleep Technology* (3rd ed.), split-volume 3 PDF p.185 and Kapur et al. (2017), Recommendation 3: negative HSAT with continuing OSA suspicion warrants clinician-directed attended PSG. Correct choice supported. | Human semantic family review pending; owner clinical signoff COMPLETE. |

## Repository/CI evidence

- [Revised proposal audit](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38347685778): succeeded; all 3,240 effective bank records inspected programmatically, **0 hard errors, 0 token-warning flags, 0 normalized exact prompt collisions** for seven. This alone is **not** exhaustive human semantic review.
- [Owner-release safeguards](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38347685715): succeeded; all seven held, all five existing revisions held and 15 duplicate retirements prohibited.
- [New seven-item preflight test](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38347685778): succeeded; IDs, BRPT task codes, existing keyed answers, 4 unique response choices, exact source fields and held flags checked.
- [V3 browser learner-flow job](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38347685808): **job succeeded** when inspected. This does **not** document a real same-origin V2/V3 saved-history export/replay, cross-version reports and full representative learner migration.
- [PR #140](https://github.com/Fishingcoder2/Sleeppathewaysguild/pull/140): owner RPSGT item approval is documented in `OWNER-CLINICAL-ITEM-APPROVAL-2026-10-13.json`; an external review is not required by updated Guild policy.
- Uploaded `333828895-Sleep-Stage-Scoring-c3-version.pdf` is a training deck with a 2015 creation date; it is **not** the licensed AASM Scoring Manual v3 (released February 2023).

## Publication safeguards

The Guild creator/owner explicitly amended the policy on October 13, 2026: **owner RPSGT clinical content review is sufficient; a second independent reviewer is not required.** All seven stems, answers, distractors and rationales have the owner's explicit approval. Comprehensive human semantic-family review, relevant licensed scoring checks and actual saved-progress/history/report regression remain unresolved. Keep all seven draft proposals `proposed-not-learner-eligible`, all five existing revisions held, and all 15 duplicate-retirement candidates active. Do not alter the existing V2 public learner bank, V3 modules, approved question overlay, IDs, history or migration keys.

**Exact outcome after policy amendment: seven source-supported concepts; seven owner RPSGT clinical reviews completed; no second reviewer required; zero licensed scoring clearance for item 008; zero full real-history regression signoffs; zero newly published questions.** Do not promote directly from these proposal files into learner pools.

## Key source locators

- AAST (2021), *Standard polysomnography*, §§2.2.3, 3.3.1–3.3.2: https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf
- Maski et al. (2024), pediatric MSLT Box 2: https://pmc.ncbi.nlm.nih.gov/articles/PMC10985297/
- Krahn et al. (2021), adult MSLT Box 2: https://pmc.ncbi.nlm.nih.gov/articles/PMC8726366/
- Winkelman et al. (2025), RLS/PLMD guideline: https://pmc.ncbi.nlm.nih.gov/articles/PMC11701286/
- Kapur et al. (2017), adult OSA diagnostic guideline Recommendation 3: https://pmc.ncbi.nlm.nih.gov/articles/PMC5337595/
- AASM public V3 FAQ: https://learn.aasm.org/AssetListing/The-AASM-Manual-for-the-Scoring-of-Sleep-and-Associated-Events-Series-2-1455/Scoring-of-Sleep-and-Associated-Events-FAQs-6696
- AASM February 2024 V3 erratum: https://aasm.org/wp-content/uploads/2024/03/ScoringManual_3_Erratum_Document_3-1.pdf


## 2026-10-13 owner-as-clinical-reviewer amendment

The Guild's sole owner and maker, an RPSGT with pediatric badge certificate, expressly directed elimination of the mandatory outside/independent second reviewer. All seven revised question stems, keyed answers, distractors and rationales carry the owner's documented clinical approval. This is **not** independent external review and should never be described as such. `OWNER-CLINICAL-ITEM-APPROVAL-2026-10-13.json` documents that approval; the source/manual check, human question-family disposition and real V2/V3 learner-history regression remain required. Five proposed existing-item edits still need separate owner review. The 15 duplicate-retirement candidates remain untouched.
