# RPSGT V2/V3 — conditional owner approval: checked evidence, clinical clearance queue

**Checked 2026-10-13. Intended for development audit and clinical review, not a learner-facing page.**

The Guild owner explicitly authorizes **seven new questions** for publication *after all previously identified source, qualified clinical, manual, duplicate-family and real V2/V3 learner-progress regression gates pass*; authorizes **five existing-question revisions to proceed** toward those gates; and explicitly forbids the **15 duplicate retirements**. See `OWNER-CONDITIONAL-APPROVAL-2026-10-13.json`. **This authorization is not independent qualified clinical review.**

## Scope and source verification

The editorial priority remains the BRPT exam blueprint and candidate handbook, followed by original BRPT-recommended Guild-indexed books. Modern AASM/AAST/ICSD criteria control claims that differ from older textbook editions. The following evidence has been examined directly, rather than inferred from indexed chapter titles alone:

- The uploaded *Fundamentals of Sleep Technology*, 3rd ed., split-volume 2 **PDF p. 14** describes earlier symptom onset, shorter rest latency and spread to other body regions with RLS augmentation on prolonged dopaminergic treatment. **The older textbook's first-line treatment preferences must not be taught as current pharmacotherapy**; current Winkelman et al. (2025) provides the medication-era overlay: <https://pmc.ncbi.nlm.nih.gov/articles/PMC11701286/>.
- The same textbook, split-volume 3 **PDF p. 185**, explicitly states that with a negative HSAT and persistent high OSA suspicion, PSG should be ordered; Kapur et al. (2017) recommendation 3 confirms the clinician-directed diagnostic pathway: <https://pmc.ncbi.nlm.nih.gov/articles/PMC5337595/>.
- The uploaded Maski et al. (2024) pediatric MSLT article **PDF p. 4, Box 2 point 2** states PSG with **at least 8 h time in bed and 7 h sleep**, and no MSLT after a PAP pressure-adjustment (including split-night/initial titration): <https://pmc.ncbi.nlm.nih.gov/articles/PMC10985297/>.
- Krahn et al. (2021) **Box 2 point 1** provides the analogous **adult** MSLT protocol: preceding attended PSG with at least **7 h in bed and 6 h total sleep**, no MSLT after PAP pressure-adjustment, including split-night/titration. Never substitute pediatric minima in adult answers or vice versa: <https://pmc.ncbi.nlm.nih.gov/articles/PMC8726366/>.
- The AAST *Standard Polysomnography* technical guideline (2021) **§2.2.3, PDF p. 13** supports inspecting EOG/EEG/EMG impedance and waveform during physiological calibration, and fixing/repeating checks for channel problems; **§§3.3.1–3.3.2, PDF p. 16** support an event chronology, technical difficulties, interventions and complete PSG summary: <https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf>.
- The public AASM *Scoring Manual Version 3* FAQ confirms **adult respiratory scoring criteria for children ≥13 years are optional**; its public summary supports the nine-year-old question's age distinction. The complete current **licensed Version 3** respiratory rule and relevant errata **have not been directly checked**: <https://learn.aasm.org/AssetListing/The-AASM-Manual-for-the-Scoring-of-Sleep-and-Associated-Events-Series-2-1455/Scoring-of-Sleep-and-Associated-Events-FAQs-6696>.
- The uploaded 2023 **ICSD-3-TR correction**, local PDF **p. 3**, specifies **at least 25%** of total sleep time in pediatric OSA **obstructive hypoventilation diagnostic** Criterion B(2) along with hypercapnia and an obstructive feature. The BRPT-recommended textbook's split-volume 4 **PDF p. 40** prints **more than 25%** for a standalone PSG hypoventilation **scoring rule from old AASM Version 2.5**. Do not conflate these; do not change the current diagnostic correct answer on this basis.

**Citation boundary:** Checking the specific guideline page or section establishes support for the stated concept; it does **not** mean the full individual answer/distractor/rationale and semantic novelty have been independently clinically signed off. Indexed Spriggs and recommended-book section matches are not statement-level passage verification unless a specific passage was reviewed.

## New questions — conditional approval and individual outstanding gates

| ID | BRPT task | Clinical concept source preflight | Necessary remaining gate |
|---|---|---|---|
| `SPG-SPRIGGS-2026-003` | D2A | AAST 2021 PSG §2.2.3 supports EOG calibration signal check and correction | Independent clinical/editorial item review; all options/rationale; semantic overlap with calibration family; actual V2/V3 learner history regression |
| `SPG-SPRIGGS-2026-005` | D2B | Direct Maski et al. (2024) Box 2 check: 8 h in bed/7 h sleep for child | Independent clinical/editorial item review; semantic overlap with pediatric MSLT bank; actual V2/V3 learner history regression |
| `SPG-SPRIGGS-2026-006` | D2B | Krahn et al. (2021) Box 2 confirms no adult MSLT after split-night PAP adjustment | Independent clinical/editorial item review; semantic overlap with adult MSLT bank; actual V2/V3 learner history regression |
| `SPG-SPRIGGS-2026-008` | D3B | Public AASM v3 FAQ confirms 13+ optional adult respiratory rule; 9-year-old does not meet age | **Licensed current AASM v3 pediatric rule and errata text**; independent item/semantic clinical review; V2/V3 regression |
| `SPG-SPRIGGS-2026-009` | D3C | AAST 2021 PSG §§3.3.1–3.3.2 supports technical interruption and intervention documentation | Independent clinical/editorial item review; semantic overlap with PSG logging families; V2/V3 regression |
| `SPG-GAP-2026-001` | D1A | Direct FST3 passage and AASM 2025 RLS augmentation guidance support symptom progression, not technologist prescribing | Independent clinical/editorial item review; all RLS question-family prompts; V2/V3 regression |
| `SPG-GAP-2026-002` | D2B | Direct FST3 passage and Kapur et al. (2017) recommendation 3 support clinician-directed PSG after negative HSAT | Independent clinical/editorial item review; all HSAT decision-family prompts; V2/V3 regression |

**Current new-question learner eligibility: 0 of 7.** All seven remain `manualReviewRecommended`, `publicationStatus=proposed-not-learner-eligible`, and excluded from current V2/V3 learner question banks.

## Existing question revisions — proceeding only, not yet applied

| ID | What is being reviewed | Release gate |
|---|---|---|
| `imp-051` | Adult MSLT rationale context and precise Krahn et al. citation; preserve original answer and ID | Independent clinical/editorial review; V2/V3 browser history/answer report regression; exact source-key validation |
| `grow-041` | Adult MSLT rationale about SOREMPs and complete clinical interpretation | Same gates; do not infer diagnosis from MSLT numbers alone |
| `mb-pediatric-mixed-4` | Clarify **ICSD-3-TR pediatric OSA diagnosis**, keeping existing "at least 25%" answer | Clinical/editorial review and V2/V3 history regression; **never substitute older PSG-scoring threshold** |
| `imp-050` | Pediatric hypopnea explanation needs applicable event-duration context | Direct licensed current AASM v3 rule verification, independent clinical/editorial review and V2/V3 history regression |
| `boost-039` | Pediatric central apnea short-event question needs two-missed-breath qualifier | Direct licensed current AASM v3 rule verification, independent clinical/editorial review, semantic overlap and V2/V3 history regression |

**Current revision publishability: 0 of 5.** Preserve existing question IDs, options, correct answers, rationale and current learner records until all corresponding gates are documented. Never silently alter saved user progress or score historic attempts against an unreviewed replacement.

## Duplicates and webapp boundaries

- **15 duplicate-retirement candidates: prohibited from activation**, not merely postponed. Retain all currently eligible question IDs, original records, storage/answers and scoring history until a separate owner decision.
- The **3,240 original/effective shared question IDs** must remain preserved. This includes 2,920 original V2/V3 source questions and 320 previously owner-approved additions; currently held records must remain held.
- V2 remains the canonical public app. V3 is development-only until its separate release-readiness document's real learner export/migration and full interactive desktop/mobile requirements are demonstrated.
- CI/static mock/practice/ID parity checks are helpful but **do not equal a real same-origin learner history/report browser replay**.

## Exact publication decision

| Release category | Authorized to proceed | Validated for new learner activation | Can publish as learning content now |
|---|---:|---:|---:|
| Seven new original questions | 7, conditional | 0 | **0** |
| Five existing-question revisions | 5, conditional | 0 | **0** |
| Duplicate retirements | 0, expressly prohibited | 0 | **0** |
| Source/audit evidence and approval records | Yes | Documentation and CI checks | Already on `main`; publishable as **internal review artifacts only** |

The remaining **independent qualified clinical signoff** cannot be inferred from a source citation, from a passing JavaScript test, or from the owner's conditional approval. Release the learning-content items only after per-item gate status changes from pending to verified, followed by approved ID-preserving V2/V3 import and real learner regression.
