# RPSGT V2/V3 — seven-candidate semantic-family and editorial triage
**Date:** 2026-10-13  
**Review status:** EDITORIAL PREFLIGHT ONLY — NOT INDEPENDENT QUALIFIED CLINICAL SIGNOFF; NO LEARNER RELEASE  
**GitHub baseline:** `a90d651d478b39e88573cae9436e907d811ff994`  
**Owner decision:** `OWNER-CONDITIONAL-APPROVAL-2026-10-13.json` (unchanged; seven conditional approvals, five revisions authorized to proceed, zero duplicate retirements)

## What was inspected

- Read the five proposed Spriggs items in `spriggs-modernized-2026-10-12.json` and two gap items in `spriggs-gap-pilot-2026-10-12.json`, including stem, all four responses, keyed answer, rationale, QA flags and source references.
- Examined the **2026-10-13** GitHub Actions artifact `spriggs-rpsgt-full-bank-duplicate-audit` from [run 38346195755](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38346195755): `spriggs-full-bank-report.json`, `spriggs-gap-pilot-audit-2026.json`, and exact-family report. Those automated audits scanned 2,920 original + 320 previously approved questions (3,240 effective bank records); the gap audit also inspected the five prior held drafts.
- Conducted preliminary human-readable decision-family comparison against the returned nearest-neighbor prompts and the available D1A, D1B, D1C, D2B, D3B, D4B, D4C, and cross-task D2A/D2C modules. Reviewed response intent, not solely matching words. Other large modules were represented through the full-bank automated audit; **this is not an exhaustive human review of all 3,240 item texts**.
- Directly read user-provided source PDF passages: Maski et al. (2024), page 4, Box 2 item 2; ICSD-3-TR correction PDF page 3; *Fundamentals of Sleep Technology*, split-volume 2 page 14 and split-volume 3 page 185. Preserved the prior controlling-guideline checks in the release-evidence queue.

## Automated results and their limits

**Seven of seven:** no exact normalized prompt collision reported. **Seven of seven:** no elevated weighted-token-warning threshold reached in the existing GitHub audits. This does **not** establish clinical novelty, appropriate distractors, or independence of underlying decisions. Confidence is bounded by heuristic and sampled manual-family review.

## Individual editorial triage

| Candidate | Overlapping existing examples and decision-family distinction | Preliminary quality judgment | Remaining gates |
|---|---|---|---|
| `SPG-SPRIGGS-2026-003` EOG calibration | `RPSGT-MOCK-D2-051` asks for correction of a flat anterior-tibialis channel during physiologic calibration; `boost-022` checks eye-movement instruction. The proposed question adds a unilateral flat EOG troubleshooting case. | Keyed electrode/connection/impedance/derivation check and repeat calibration is supported in principle by AAST PSG §2.2.3. **Meaningful overlap in general repair decision**: reviewer must decide if EOG-specific application adds sufficient novelty. | Independent clinician/item signoff; explicit full semantic-family review; actual V2/V3 history/browser tests. |
| `SPG-SPRIGGS-2026-005` pediatric MSLT | `expand-d2-005` and `mb-pediatric-mixed-24` address prior PSG/sufficient sleep generally. This case uniquely asks whether 6 h 20 min sleep meets the **pediatric 7 h TST** threshold despite 8 h time in bed. | Maski et al. (2024), Box 2 item 2 directly supports **at least 8 h time in bed AND at least 7 h sleep**. Answer correctly escalates under protocol rather than independently diagnosing. Distractors such as substituting oximetry are overly implausible; consider improving discrimination before qualified review. | Independent item signoff, semantic family review and V2/V3 regression. |
| `SPG-SPRIGGS-2026-006` adult MSLT | `RPSGT-B3-C008` concerns reviewing an overnight PSG before MSLT, and `RPSGT-B2-M058` defines a split-night study; neither returned example directly tests the prohibition on adult MSLT after PAP pressure adjustment. | Correct response fits Krahn et al. (2021) Box 2. Two distractors (extra ECG lead, using overnight PSG as an MSLT nap) are implausible and should receive item-quality review. Do not mix in pediatric minimum sleep thresholds. | Independent item signoff, semantic family review and V2/V3 regression. |
| `SPG-SPRIGGS-2026-008` pediatric respiratory scoring | `RPSGT-B6-S185`, `mine-d3b-006`, and pediatric scoring items address age-appropriate scoring generally. Proposed case specifies a nine-year-old and inappropriate adult software default. | Public AASM FAQ supports age distinction, but **current licensed AASM Scoring Manual Version 3 rule/errata has not been verified directly**. The distractor about changing the patient's reported age is weak. **Hard hold independent of other gate status**. | Licensed AASM v3 rule and errata; independent clinical/item review; full semantic review; V2/V3 regression. |
| `SPG-SPRIGGS-2026-009` PSG documentation | `RPSGT-B5-S068` and `RPSGT-B3-C060` ask about a displaced cannula/flat signal and initial troubleshooting. This question instead tests *chronological documentation* of the 02:10–03:00 limitation and restoration. | AAST PSG §§3.3.1–3.3.2 support the chronology and technical summary. Distractors mostly rely on obviously poor documentation; stronger realistic alternatives may improve difficulty. | Independent item signoff, semantic family review and V2/V3 regression. |
| `SPG-GAP-2026-001` RLS augmentation | `RPSGT-B2-M011`, `D1A-027`, and `v1265-med-011` cover RLS symptoms or medication history, not the returned proposed *augmentation recognition and escalation* decision. | FST3 vol. 2 p.14 describes earlier onset and spreading symptoms; current Winkelman et al. (2025) supersedes its old dopamine-agonist treatment preferences. Answer correctly documents and notifies prescriber, rather than prescribing. | Independent item signoff, human concept-family review (including terms absent from literal search), V2/V3 regression. |
| `SPG-GAP-2026-002` negative HSAT | `RPSGT-B5-S060` explores HSAT limitations; `nm-018` concerns follow-up after an OSA diagnosis; neither returned example is the same decision as a negative HSAT with persistent suspicion. | FST3 vol. 3 p.185 explicitly calls for PSG when HSAT negative and suspicion remains high; Kapur et al. (2017) Recommendation 3 supports the clinician-directed pathway. Check that technologist-versus-prescriber role is preserved. | Independent item signoff, human concept-family review, V2/V3 regression. |

### Specific editorial concerns for qualified reviewers

1. For `003`, determine whether this is distinct enough from the anterior-tibialis physiologic-calibration case to warrant an additional active learner item.
2. For `005`, `006`, `008`, and `009`, consider replacing transparently implausible distractors with realistic but unambiguously incorrect alternatives. **These are suggestions only; do not edit any proposals or answer keys until vetted.**
3. For `008`, compare exact current licensed pediatric respiratory language and errata; public FAQ or a historical textbook alone **does not close** this requirement.
4. For all seven, document reviewer identity/qualification, actual stem/key/options/rationale decision, date, controlling passage locator, and semantic family disposition independently. No reviewer credential, signoff or clinical release is asserted here.

## Source role separation

- **Pediatric MSLT:** Maski et al. (2024), Box 2: 8 h in bed / 7 h TST; PAP adjustment exclusion.
- **Adult MSLT:** Krahn et al. (2021), Box 2: 7 h in bed / 6 h TST and no post-titration/split-night MSLT. Do not substitute pediatric minima.
- **RLS:** FST3 vol. 2 p.14 supports augmentation symptom pattern but its older preference for dopamine agonists is not current prescribing guidance. Use Winkelman et al. (2025) for current clinical medication context.
- **HSAT:** FST3 vol. 3 p.185 and Kapur et al. (2017) Recommendation 3 support PSG following a negative HSAT when suspicion remains high.
- **Pediatric obstructive hypoventilation separate revision `mb-pediatric-mixed-4`:** corrected ICSD-3-TR pediatric OSA diagnosis uses **at least 25%** TST with hypercapnia and obstructive features; do not replace with historical **more than 25%** PSG-scoring language. Preserve existing answer.
- **AASM v3:** Licensed current scoring-rule text and applicable errata remain uninspected for candidate `008` and revisions `imp-050` and `boost-039`.

## Publication gate state after this triage

| Category | Currently published via this review | Gate disposition |
|---|---:|---|
| Seven conditionally owner-approved new questions | **0** | Held: independent professional review, complete semantic-family certification, V2/V3 real-history/browser regression; plus licensed AASM v3 for `008` |
| Five authorized revisions | **0** | Held: independent clinical/editorial and regression; licensed AASM v3 for `imp-050` and `boost-039` |
| Fifteen candidate duplicate retirements | **0** | Owner explicitly prohibited; all existing IDs and learner eligibility unchanged |
| Existing bank and saved progress | **No modification** | 3,240 established IDs and all history remain preserved |

This record is development-audit material, not content for learners, not a release overlay, and not independent clinical signoff. It changes no question, answer, ID, eligibility, storage key, mock weighting, or webapp entry point.

### Evidence pointers

- [Owner release safeguards CI, exact baseline](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38346195786)
- [Full-bank candidate audit artifact, exact baseline](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38346195755)
- `rpsgt-v3/data/question-proposals/RELEASE-EVIDENCE-AND-REVIEW-QUEUE-2026-10-13.md`
- Maski, K. P., et al. (2024). Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in children: Guidance from the American Academy of Sleep Medicine. *Journal of Clinical Sleep Medicine, 20*(4), 631–641.
- Krahn, L. E., et al. (2021). Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in adults: Guidance from the American Academy of Sleep Medicine. *Journal of Clinical Sleep Medicine, 17*(12), 2489–2498. https://doi.org/10.5664/jcsm.9620
- Winkelman, J. W., et al. (2025). Treatment of restless legs syndrome and periodic limb movement disorder: An American Academy of Sleep Medicine clinical practice guideline. *Journal of Clinical Sleep Medicine, 21*(1), 137–152. https://doi.org/10.5664/jcsm.11390
- Kapur, V. K., et al. (2017). Clinical practice guideline for diagnostic testing for adult obstructive sleep apnea. *Journal of Clinical Sleep Medicine, 13*(3), 479–504. https://doi.org/10.5664/jcsm.6506
