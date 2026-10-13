# RPSGT Spriggs-indexed topical gap pilot — two original candidates
*Editorial evidence ledger, October 12, 2026*

**Publication status: HELD — no clinical signoff or owner approval.**

## Why this pilot exists

The Guild's October 2026 command-center workbook already marks movement/RLS/PLMD distinctions, MSLT protocol validity, and integrated pediatric respiratory reasoning as build priorities while warning against repetitive staging, report arithmetic, and PAP leak questions. Its family counts are heuristic topic-label counts, not a guarantee of correct or complete competence.

A new [full-bank 12-pattern topic audit](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38332022784) parsed 3,240 effective question prompts (2,680 current learner-eligible, 560 existing manual holds). It returned few *specific phrase* matches in some areas. A zero in that scan means only that a narrow phrase pattern did not match a prompt; it is not proof of a content gap.

A separate [whole-bank comparison of the two new candidates](https://github.com/Fishingcoder2/Sleeppathewaysguild/actions/runs/38332267610) passed with zero structural/source-key errors and zero high weighted-word similarity alerts. It surfaced **six RLS-related** and **43 HSAT-related** existing prompt/topic matches for human concept review, while the previous five Spriggs pilot items were also checked for ID/prompt collisions. This is **not** a semantic or clinical approval.

## Question 001 — RLS augmentation during intake (D1A)

- **Distinct decision tested:** A patient on long-term ropinirole develops progressively earlier-onset symptoms, shorter rest latency and spread to the arms. The technologist documents the medication/symptom chronology and refers possible augmentation to the treating clinician, rather than selecting or altering drug dosing or confusing RLS with PLMD.
- **Spriggs instructional topic seed:** *Essentials of Polysomnography*, 2nd ed., Chapter 2 (*Sleep Disorders*, pp. 12–34; Guild mapped PDF pp. 26–48). This is chapter-level topology only; no direct supporting Spriggs passage/page has been verified.
- **Current controller:** Winkelman et al. (2025), AASM RLS/PLMD treatment guideline, augmentation discussion, doi:10.5664/jcsm.11390. ICSD-3-TR governs disorder classification if diagnosis is requested, but the case does not ask the technologist to diagnose a disorder.
- **Existing-bank context:** Direct D1A records include baseline RLS screening, RLS-vs-PLMD recognition, iron/medication history, and drug-class vocabulary. The logged full-bank family screen found six RLS-related existing records. None of those listed examples explicitly tests the new *progression while taking dopamine agonists* decision.
- **Risk and review:** Verify all existing six family examples and any unflagged variants before final uniqueness decision; independent clinician or RPSGT educator must assess distractor quality and appropriate scope.

## Question 002 — negative adult HSAT with persistent symptoms (D2B)

- **Distinct decision tested:** An adult's technically adequate initial HSAT is negative, but signs of possible OSA persist. The appropriate guideline pathway is clinician-directed attended PSG, not repeating the same HSAT as an automatic default or treating the result as definitive exclusion.
- **Spriggs topic seed:** *Essentials of Polysomnography*, 2nd ed., Chapter 11 (*Performing Other Types of Sleep Studies*, pp. 153–156; Guild mapped PDF pp. 167–170). This old source provides a **study-type topic heading only**, not the 2017 current diagnostic recommendation.
- **Current controller:** Kapur et al. (2017), AASM diagnostic testing guideline, **Recommendation 3**, doi:10.5664/jcsm.6506. AAST HSAT (2020) is supporting *technologist workflow*, not diagnostic-test choice. The AASM 2021 *longitudinal follow-up* guidance addresses patients with already established OSA and is not the controlling paper here.
- **Existing-bank context:** Existing D2B HSAT items cover portable-equipment setup, limitations, comparison with PSG, patient education and follow-up of treated OSA. The 43-item broader family screen (across tasks) contains HSAT coverage but not an obvious identical *negative initial HSAT → PSG* decision among logged examples.
- **Risk and review:** Inspect all 43 HSAT-related source prompts for semantic collisions, ensure the stem clearly describes **adult initial diagnosis**, and obtain independent clinical QA.

## Controls for both

- Both are **original four-option cases**, never copied from a Spriggs book review question, figure, or exam.
- Every candidate carries `qa.manualReviewRecommended: true` and `publicationStatus: proposed-not-learner-eligible`.
- The earlier five-question pilot remains separate and unchanged.
- Neither source key mapping nor chapter range constitutes a verified textbook passage/page citation.
- Only formatted APA 7 references should appear in the learner experience; internal key names, audit flags and "mapped reference" labels must never be shown.
- No update to `data/owner-approved-question-release.json`, the canonical bank manifest or active learner pools.

## APA 7 references

Kapur, V. K., Auckley, D. H., Chowdhuri, S., Kuhlmann, D. C., Mehra, R., Ramar, K., & Harrod, C. G. (2017). Clinical practice guideline for diagnostic testing for adult obstructive sleep apnea: An American Academy of Sleep Medicine clinical practice guideline. *Journal of Clinical Sleep Medicine, 13*(3), 479–504. https://doi.org/10.5664/jcsm.6506

Spriggs, W. H. (2015). *Essentials of polysomnography: A training guide and reference for sleep technicians* (2nd ed.). Jones & Bartlett Learning.

Winkelman, J. W., Berkowski, J. A., DelRosso, L. M., Koo, B. B., Scharf, M. T., Sharon, D., Zak, R. S., Kazmi, U., Falck-Ytter, Y., Shelgikar, A. V., Trotti, L. M., & Walters, A. S. (2025). Treatment of restless legs syndrome and periodic limb movement disorder: An American Academy of Sleep Medicine clinical practice guideline. *Journal of Clinical Sleep Medicine, 21*(1), 137–152. https://doi.org/10.5664/jcsm.11390
