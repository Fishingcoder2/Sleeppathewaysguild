# RPSGT V3 question rehabilitation — Batch 2 (November 9, 2026)

**Scope:** Second 25 of 539 RPSGT items flagged `manual_review_recommended=1` in
Cloudflare D1 `sleep_pathways_tutor_dev`. This phase is **editorial drafting and
structural QA**, not release, clinical approval, or certification of references.

## Actual D1 result

| Workflow state | Total |
| --- | ---: |
| Batch 1 drafted | 25 |
| Batch 2 drafted | 25 |
| Total proposed drafts | **50** |
| Additional flagged RPSGT questions queued | **489** |
| Original RPSGT flagged questions tracked | **539** |

Batch ID: `RPSGT-REHAB-2026-11-09-P25-B2`

The 25 second-batch source hashes still match the canonical
`spg_questions.content_hash`; the same is true for **all 539** intake records.
No original question text, answers, learner eligibility, question versions, or
published releases were modified. As of this snapshot, **24 of these 25
original items are marked Practice-eligible and 23 are Mock-eligible in the
D1 shadow database**. That does **not** prove active V2/V3 exposure because the
static apps have not been confirmed cut over to D1. Review flags are provenance,
not automatic learner exclusion.

## Task-balanced second batch

| Domain/task | Source question ID | Editorial topic |
| --- | --- | --- |
| D1A | `101` | Medical history and medications |
| D1A | `RPSGT-B2-M014` | Opioids and central apnea risk |
| D1B | `RPSGT-B3-C017` | Pediatric caregiver education during PSG |
| D1B | `RPSGT-B3-C020` | MSLT medication/caffeine/napping education |
| D1C | `RPSGT-B2-M026` | PAP download report review |
| D1C | `RPSGT-B3-C023` | PAP leak and residual events |
| D2A | `RPSGT-B2-M040` | SpO2 versus ventilation |
| D2A | `RPSGT-B2-M042` | Thermal airflow and nasal pressure |
| D2A/D2C unresolved | `RPSGT-MOCK-D2-053` | Common-mode rejection; D2-C7 proposed only |
| D2B | `RPSGT-B2-M050` | Adult MSLT |
| D2B | `RPSGT-B2-M051` | Adult MWT |
| D2C | `RPSGT-B2-M065` | CO2 trend interpretation |
| D2C | `RPSGT-B2-M070` | Leak artifact troubleshooting |
| D3A | `RPSGT-B2-M075` | N3 slow waves |
| D3A | `RPSGT-B2-M076` | REM physiology |
| D3A | `RPSGT-B2-M077` | Arousal rule awareness |
| D3B | `RPSGT-MOCK-D3-086` | Pediatric respiratory scoring context |
| D3C | `RPSGT-B2-M103` | REM latency calculation |
| D3C | `RPSGT-B2-M104` | WASO calculation |
| D4A | `RPSGT-B2-M111` | Bilevel pressure support |
| D4A | `RPSGT-B2-M115` | APAP operating concept |
| D4B | `RPSGT-B2-M141` | Hypoglossal nerve stimulation candidacy |
| D4B | `RPSGT-B3-C139` | Pediatric adenotonsillectomy evaluation |
| D4C | `RPSGT-B2-M148` | Oxygen flow units and authorized order |
| D4C | `RPSGT-B2-M149` | Oxygen fire safety |

Domain totals: **D1=6, D2=7, D3=6, D4=6**. All 12 main BRPT task categories
appear plus one unresolved D2A/D2C item. Original task code is not changed
or auto-mapped to LMS.

## Draft structure and QA

Each of the 25 drafts is stored in
`spg_question_rehab_reviews.proposed_rewrite_json`, explicitly marked
`draft-not-learner-eligible`. Each includes an original clinical question
stem, four unique answer choices, a matching answer-key index and string,
a complete rationale, four individual answer-choice explanations, a
proposed exact BRPT subtask, candidate APA references and source-locator
notes. The student display should show normal APA references, never internal
reference-mapping labels.

**Batch 2 structural checks passed: 25/25** for JSON validity, four
unique choices, four explanations, matching answer key, non-publication
status, and source hash preservation.

**Clinical and bibliography approval count: 0/25.**

- **7** drafts have explicit status flags for direct licensed AASM Scoring
  Manual Version 3 passage checking. This includes N3, REM, arousal, pediatric
  scoring, sensor context, and reporting calculations. All other references
  also require independent final review.
- **1** draft (`RPSGT-MOCK-D2-053`) has an unresolved D2A/D2C mapping.
  Its proposed `D2-C7` classification is editorial only; **do not remap**.
- The pediatric caregiver item still needs a directly applicable pediatric
  PSG reference; the available pediatric MSLT/MWT source does not by itself
  prove that specific assertion.
- The HNS source includes a **CMS coverage determination**, whose numerical
  eligibility thresholds are payer-specific rather than universal medical
  criteria. No arbitrary universal eligibility cutoff is taught.
- The AAST *Standard Polysomnography* guideline (updated 2021) **excludes**
  pediatric PSG and therapeutic PAP/oxygen titration from its scope.
- Every draft retains
  `citation_qa=pending-formal-apa7-and-exact-locator-check`. Full author
  lists, primary-source passages, applicability, dates, and edition need
  verification. Candidate citations using `et al.` are not final APA 7.

## Selected primary sources for independent verification

- Board of Registered Polysomnographic Technologists. (n.d.). *RPSGT exam
  blueprint*. https://brpt.org/rpsgt/exam-blueprint/
- American Association of Sleep Technologists. (2021). *Standard
  polysomnography* [Technical guideline].
  https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf
- Krahn, L. E., Arand, D. L., Avidan, A. Y., Davila, D. G., DeBassio,
  W. A., Ruoff, C. M., & Harrod, C. G. (2021). *Recommended protocols for
  the Multiple Sleep Latency Test and Maintenance of Wakefulness Test in
  adults*. *Journal of Clinical Sleep Medicine, 17*(12), 2489–2498.
  https://doi.org/10.5664/jcsm.9620
- Patil, S. P., Ayappa, I. A., Caples, S. M., Kimoff, R. J., Patel, S. R.,
  & Harrod, C. G. (2019). Treatment of adult obstructive sleep apnea with
  positive airway pressure: An American Academy of Sleep Medicine clinical
  practice guideline. *Journal of Clinical Sleep Medicine, 15*(2), 335–343.
  https://doi.org/10.5664/jcsm.7640
- Marcus, C. L., et al. (2012). Diagnosis and management of childhood
  obstructive sleep apnea syndrome. *Pediatrics, 130*(3), 576–584.
  https://doi.org/10.1542/peds.2012-1671
- Centers for Medicare & Medicaid Services. (n.d.). *Hypoglossal nerve
  stimulation for the treatment of obstructive sleep apnea* (LCD L38307).
  https://www.cms.gov/medicare-coverage-database/view/lcd.aspx?DocID=L38307&LCDId=38307
- American Lung Association. (2026). *Oxygen therapy: Using oxygen safely*.
  https://www.lung.org/lung-health-diseases/lung-procedures-and-tests/oxygen-therapy/using-oxygen-safely

Above list is a **verification bibliography**, not a set of final approved
student citations.

## Reproducible review and non-publication gates

- Schema: `migrations/0002_question_rehab_reviews.sql`
- First intake: `migrations/0003_question_rehab_intake_2026_11_08.sql`
- Second intake: `migrations/0004_question_rehab_batch2_2026_11_09.sql`
- First pilot QA: `scripts/rpsgt-question-rehab-qa.sql`
- Second batch QA: `scripts/rpsgt-question-rehab-batch2-qa.sql`
- Drafts remain **only in the D1 review table**. No automatic promotion,
  schema-to-release conversion, task remapping, or changes to learner-facing
  Practice, Readiness, Mock, Guided Study or Reports.
- Final approval requires a subject matter reviewer to check the actual
  versioned rule passages, correct answer and distractors, citations, and
  blueprint, then a separate explicit owner approval.
