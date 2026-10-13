# Sleep Pathways Guild — held seven-question editorial compliance revisions

**Date:** October 13, 2026  
**Stage:** Original proposal refinement only — **NOT learner-facing, NOT qualified independent clinical signoff, NOT licensed AASM v3 verification.**  
**Repository baseline:** `a90d651d478b39e88573cae9436e907d811ff994` on `main`.  
**Source:** `OWNER-CONDITIONAL-APPROVAL-2026-10-13.json` and `RELEASE-EVIDENCE-AND-REVIEW-QUEUE-2026-10-13.md`.  
**Supporting prior triage:** [PR #139](https://github.com/Fishingcoder2/Sleeppathewaysguild/pull/139) (a separate, draft, non-publishing editorial/semantic-family preflight).

## Change scope and invariants

Revised the *unpublished* `options` and `rationale` fields for **all seven** conditionally approved draft items, within:
- `spriggs-modernized-2026-10-12.json` — five proposals
- `spriggs-gap-pilot-2026-10-12.json` — two proposals

All draft `id`, `taskCode`, `answer`, `prompt`, source/reference metadata, QA hold flags and `publicationStatus=proposed-not-learner-eligible` values were **preserved**. No historical/question-bank files, V2 embedded data, V3 task modules, owner-approved overlay, active learner answers, migration keys, scoring/reporting code, duplicate eligibility, or public app configuration were edited.

The purpose is to improve single-best-answer discrimination and clarify the relevant clinical/protocol boundaries **in readiness for** qualified review. Do not treat the changes as clinical signoff or permission to activate questions.

| Held ID | BRPT | Editorial correction and stronger incorrect-choice themes | Controlling evidence / limitation |
|---|---|---|---|
| `SPG-SPRIGGS-2026-003` | D2A | Contrast electrode/connector/impedance/derivation troubleshooting with merely repeating commands, copying another derivation, or changing gain without integrity verification. | AAST *Standard Polysomnography* guideline (2021), physiological calibration §2.2.3. EOG specific overlap with general flat-channel examples still needs independent semantic reviewer disposition. |
| `SPG-SPRIGGS-2026-005` | D2B | Differentiate 8 hours in bed from **7 hours total sleep** for a 12-year-old; warn against substituting the adult 6-hour sleep minimum or extending a daytime nap to replace overnight sleep. | Maski et al. (2024), Box 2 item 2 (uploaded article PDF p. 4). |
| `SPG-SPRIGGS-2026-006` | D2B | Separate absolute no-MSLT-after-PAP-adjustment instruction from the adult 6-hour TST target, effective PAP treatment, and prior MSLT scheduling. | Krahn et al. (2021), Box 2. Initial titration/split-night PAP pressure-adjustment night excludes next-day adult MSLT. |
| `SPG-SPRIGGS-2026-008` | D3B | Reject automated adult template, change-only-the-age, and report-only correction workarounds; preserve correction by reviewing respiratory events under age-appropriate pediatric criteria. | Public AASM *Scoring Manual v3* FAQ: optional adult respiratory criteria for ages 13+. **Direct licensed manual + errata check remains REQUIRED and INCOMPLETE.** Do not activate. |
| `SPG-SPRIGGS-2026-009` | D3C | Discriminate a complete 02:10–03:00 technical chronology/limitation from documenting restoration alone, vague “limited” summary, or falsely recording zero respiratory events during missing signal. | AAST *Standard Polysomnography* (2021), technical log §§3.3.1–3.3.2. |
| `SPG-GAP-2026-001` | D1A | Contrast documented augmentation warning and clinician notification with technologist medication-dose changes, waiting for PLM index, or diagnosing PLMD. | *Fundamentals of Sleep Technology* (3rd ed.), split-volume 2, PDF p. 14, plus Winkelman et al. (2025) current RLS guidance. Older pharmacotherapy recommendations not adopted as current authority. |
| `SPG-GAP-2026-002` | D2B | Contrast PSG following a negative technically adequate HSAT with routine repeat home testing, empirical PAP without evaluation, and declaring OSA ruled out. | *Fundamentals of Sleep Technology* (3rd ed.), split-volume 3, PDF p. 185; Kapur et al. (2017), recommendation 3. |

## Automation added

`rpsgt-v3/scripts/test-rpsgt-seven-editorial-preflight-2026.mjs` is a **non-publishing** test. The existing `rpsgt-v3-spriggs-candidate-audit.yml` workflow was updated to execute it. The test asserts:
- Exactly seven expected proposal IDs across the two files and four distinct response choices per question.
- The unchanged correct answer text and BRPT task assignment for each proposal.
- Presence of the expected clinical reference key and key protocol/source boundary in each rationale.
- Owner conditional approval *without* final clinical signoff or learner-release approval, and preservation of `manualReviewRecommended` and `proposed-not-learner-eligible`.
- Seven drafts absent from the 320-item approved overlay; no duplicate retirements authorized.

Existing CI separately checks full 2,920-original + 320 owner-approved ID parity, source-key resolution, duplicate families and reserved V2/V3 release gates. **Even all-green CI is not independent qualified clinical review or real learner-history browser replay.**

## Outstanding gates — unchanged

1. A qualified independent clinical/editorial reviewer must evaluate the revised *entire item*: stem, answer, each incorrect choice, and rationale, document qualifications/signature/date and disposition **for each** candidate.
2. Complete independent semantic-family novelty review of each revised item against the 3,240-question bank; automatically low word-overlap scores cannot serve as clinical novelty approval.
3. For `SPG-SPRIGGS-2026-008`, directly verify the complete applicable pediatric respiratory scoring rule and current errata in the **licensed current AASM Scoring Manual Version 3**.
4. Demonstrate real-browser representative saved learner progression/history/export/report regression in both V2 and V3 with migration/progress safeguards. Do not claim CI structural checks are equivalent.
5. Use controlled item-specific release gates only after every gate closes; never import these draft files into active modules. **All fifteen duplicate-retirement candidates remain active with unchanged IDs.** Existing five revision proposals stay held separately. V2 remains public and V3 development-controlled.

## References — editorial use

American Association of Sleep Technologists. (2021). *Standard polysomnography* [Technical guideline]. https://aastweb.org/clinical-resources/technical-guidelines/

American Academy of Sleep Medicine. (2023). *The AASM manual for the scoring of sleep and associated events: Rules, terminology and technical specifications* (Version 3). https://aasm.org/clinical-resources/scoring-manual/

Kapur, V. K., Auckley, D. H., Chowdhuri, S., Kuhlmann, D. C., Mehra, R., Ramar, K., & Harrod, C. G. (2017). Clinical practice guideline for diagnostic testing for adult obstructive sleep apnea: An American Academy of Sleep Medicine clinical practice guideline. *Journal of Clinical Sleep Medicine, 13*(3), 479–504. https://doi.org/10.5664/jcsm.6506

Krahn, L. E., Arand, D. L., Avidan, A. Y., Davila, D. G., DeBassio, W. A., Ruoff, C. M., & Harrod, C. G. (2021). Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in adults: Guidance from the American Academy of Sleep Medicine. *Journal of Clinical Sleep Medicine, 17*(12), 2489–2498. https://doi.org/10.5664/jcsm.9620

Maski, K. P., et al. (2024). Recommended protocols for the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in children: Guidance from the American Academy of Sleep Medicine. *Journal of Clinical Sleep Medicine, 20*(4), 631–641. https://pmc.ncbi.nlm.nih.gov/articles/PMC10985297/

Mattice, C. D., Brooks, R. J., & Lee-Chiong, T. L., Jr. (Eds.). (2020). *Fundamentals of sleep technology* (3rd ed.). Wolters Kluwer.

Winkelman, J. W., et al. (2025). Treatment of restless legs syndrome and periodic limb movement disorder: An American Academy of Sleep Medicine clinical practice guideline. *Journal of Clinical Sleep Medicine, 21*(1), 137–152. https://doi.org/10.5664/jcsm.11390

**Citation boundary:** Original Guild textbook passage locations and current authoritative articles are documented as concept support; indexed Spriggs chapter headings are not passage-level verification. Learners continue to see APA references only if/when these items undergo a fully cleared controlled release.
