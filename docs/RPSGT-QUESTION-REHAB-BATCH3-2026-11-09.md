# Sleep Pathways Guild RPSGT — Question Rehabilitation Batch 3

Date: November 9, 2026  
Batch ID: `RPSGT-REHAB-2026-11-09-P25-B3`  
Database: `sleep_pathways_tutor_dev` (Cloudflare D1)  
Status: **All 25 proposed rewrites drafted, no clinical or owner approval, not published.**

## Batch count and integrity

- Total flagged RPSGT question records tracked: **539**.
- Completed proposed rewrites in three batches: **75** (Batch 1: 25; Batch 2: 25; Batch 3: 25).
- Remaining queued: **464**.
- All 539 original canonical question content hashes match their rehabilitation intake hashes.
- Batch 3: 25 of 25 structurally valid draft payloads, unique answer choices,
  four distractor explanations, matching answer keys, enriched rationales,
  and explicit `draft-not-learner-eligible` status.
- No changes to `spg_questions`, `spg_question_versions`,
  `spg_question_eligibility`, LMS mappings, or releases.
- These are owner-approved-release **shadow bank provenance flags**; a
  `manual_review_recommended` flag is not proof of current student exclusion.

## Questions selected, by BRPT domain and task

| Domain | Task | Original D1 question ID | Topic |
| --- | --- | --- | --- |
| D1 | A1 | RPSGT-B3-C001 | Split-night clinician order and indications |
| D1 | A1 | RPSGT-B3-C010 | Existing home oxygen, order clarification |
| D1 | B3 | RPSGT-B3-C019 | Patient asks for a diagnosis before interpretation |
| D1 | B3 | RPSGT-B6-S098 | HSAT patient sensor/setup education |
| D1 | C2 | RPSGT-B3-C025 | PAP pressure intolerance and ramp |
| D1 | C2 | RPSGT-B3-C029 | Patient request for permanent pressure changes |
| D2 | A4 | RPSGT-B2-M044 | End-tidal/transcutaneous CO₂ monitoring |
| D2 | A2 | RPSGT-B3-C042 | Tibialis EMG electrode signal validation |
| D2 | A/C unresolved | RPSGT-MOCK-D2-063 | Electrical hazard; D2-C3 proposed only |
| D2 | B1 | RPSGT-B2-M058 | Split-night adult PSG criteria |
| D2 | B3 | RPSGT-B3-C047 | Unintended sleep between adult MSLT trials |
| D2 | C4 | RPSGT-B2-M069 | Anterior tibialis EMG for leg movement |
| D2 | C3 | RPSGT-B3-C061 | Disconnected respiratory effort belt |
| D3 | A3 | RPSGT-B2-M078 | Apnea recognition |
| D3 | A3 | RPSGT-B2-M079 | Obstructive apnea and persistent effort |
| D3 | A3 | RPSGT-B2-M081 | Mixed apnea and effort transition |
| D3 | A3 | RPSGT-B2-M082 | Hypopnea and associated arousal |
| D3 | C1 | RPSGT-B3-C102 | PSG AHI calculation with sleep-time denominator |
| D3 | C1 | RPSGT-B2-M109 | HSAT REI calculation with monitoring-time denominator |
| D4 | A6 | RPSGT-B2-M116 | ASV and heart failure with reduced EF |
| D4 | A5 | RPSGT-B2-M121 | Authorized expiratory pressure relief |
| D4 | B4 | RPSGT-B3-C140 | Hypoglossal stimulation and specialist referral |
| D4 | B4 (provisional) | nm-045 | Weight-management support for OSA |
| D4 | C2 (provisional) | RPSGT-B2-M150 | Oximeter artifact before oxygen adjustments |
| D4 | C1 | RPSGT-B3-C149 | Dyspnea and prescribed oxygen order |

Domain totals: **D1=6, D2=7, D3=6, D4=6**.

Task coverage note: **D3B had no additional queued RPSGT manual-review
questions at the time of selection**. This batch covers each task category
with queued questions instead of artificially duplicating earlier pediatric
content.

## Specific safeguards and unresolved decisions

- **Direct scoring-rule verification:** Nine draft records carry reference
  status strings identifying AASM Version 3 rules or exact passages as
  needing review. The AASM scoring manual is licensed; other guidelines or
  summaries do not replace direct scoring-rule verification.
- **Blueprint decisions:** Three records explicitly retain unresolved or
  provisional placement:
  - `RPSGT-MOCK-D2-063`, original `D2A/D2C`, proposed `D2-C3` based on
    equipment safety, **not automatically remapped**.
  - `nm-045`, original `D4B`; weight-management guideline content
    may not fit BRPT D4B alternative therapy subsections without explicit
    approval.
  - `RPSGT-B2-M150`, original `D4C`; much of its educational content
    fits D2-C2 artifact assessment, but the original remains untouched.
- **Guideline changes:** The ASV item references the **2025 AASM CSA clinical
  practice guideline**, which conditionally suggests ASV in selected CSA
  contexts but advises experienced-center care and close follow-up in HFrEF.
  Independent clinician verification must check cardiac risk, device labeling
  and any new safety statements before publishing.
- **Age and modality distinctions:** Adult diagnostic PSG guidance, adult
  MSLT guidance, HSAT interpretation, pediatric scoring and PAP titration
  have distinct clinical scopes. Do not label a source as AASM V3 support
  unless an exact scoring-rule passage has been verified.
- **Documentation:** Proposed text, answer key, four rationales and candidate
  APA references remain stored only in
  `spg_question_rehab_reviews.proposed_rewrite_json`; learner-facing
  questions still read the unchanged original release.
- **Bibliography:** All drafts carry `citation_qa =
  pending-formal-apa7-and-exact-locator-check`. A source with an abbreviated
  author list or uncertain locator is not APA-approved.
- No question is eligible to transition into the canonical live bank until
  source verification, clinical review and explicit owner approval, followed
  by existing release/parity tests.

## External source anchors used for editorial drafting

These are **reference candidates**, not final approved learner citations.

- Board of Registered Polysomnographic Technologists. (n.d.). *RPSGT exam
  blueprint*. https://brpt.org/rpsgt/exam-blueprint/
- American Association of Sleep Technologists. (2021). *Standard
  polysomnography* [Technical guideline].
  https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf
- Kapur, V. K., et al. (2017). Clinical practice guideline for diagnostic
  testing for adult obstructive sleep apnea. *Journal of Clinical Sleep
  Medicine, 13*(3), 479–504. https://doi.org/10.5664/jcsm.6506
- Krahn, L. E., et al. (2021). Recommended protocols for the Multiple Sleep
  Latency Test and Maintenance of Wakefulness Test in adults. *Journal of
  Clinical Sleep Medicine, 17*(12), 2489–2498.
  https://doi.org/10.5664/jcsm.9620
- Badr, M. S., et al. (2025). Treatment of central sleep apnea in adults:
  An American Academy of Sleep Medicine clinical practice guideline.
  https://doi.org/10.5664/jcsm.11858
- Hudgel, D. W., et al. (2018). The role of weight management in the treatment
  of adult obstructive sleep apnea: An official American Thoracic Society
  clinical practice guideline. *American Journal of Respiratory and Critical
  Care Medicine, 198*(6), e70–e87.
- Patil, S. P., et al. (2019). Treatment of adult obstructive sleep apnea
  with positive airway pressure. *Journal of Clinical Sleep Medicine, 15*(2),
  335–343. https://doi.org/10.5664/jcsm.7640

## Files in GitHub draft PR #155

- `migrations/0005_question_rehab_batch3_2026_11_09.sql`:
  reproducible, idempotent selection.
- `scripts/rpsgt-question-rehab-batch3-qa.sql`: read-only structural
  and source-integrity checks.
- This report.

**Do not merge/deploy as a learner question release.**
