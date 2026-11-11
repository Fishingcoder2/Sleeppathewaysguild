# Sleep Pathways Guild — RPSGT Question Rehabilitation Batch 5
Date: November 9, 2026  
Cloudflare D1: `sleep_pathways_tutor_dev`  
Batch: `RPSGT-REHAB-2026-11-09-P25-B5`  
Status: **25 editorial rewrite drafts staged, 0 clinically approved, none published.**

## Verified D1 count after fifth batch

| Status | Count |
| --- | ---: |
| RPSGT questions with manual-review provenance | 539 |
| Proposed rewrites saved in 5 batches | 125 |
| Remaining queued questions | 414 |
| Drafts published or approved through rehabilitation | 0 |
| Original source hashes still matching intake | 539/539 |

The original `spg_questions`, student eligibility, version history, and active
question releases were not modified. D1 shadow-bank `manual_review_recommended`
flags indicate *provenance* and do not by themselves prove learner exclusion
or current static V3 app exposure.

## Source IDs and editorial focus

| Domain | Source ID | Proposed task | Revision focus |
| --- | --- | --- | --- |
| D1 | RPSGT-B3-C003 | D1-A2 | Pediatric history, caregiver observations and preparation |
| D1 | RPSGT-B4-R082 | D1-A2 | Suspected obesity hypoventilation and awake PaCO₂ context |
| D1 | RPSGT-B6-S109 | D1-B3 | Patient education about conditional split-night conversion |
| D1 | RPSGT-MOCK-D1-097 | D1-B1 | Patient distress, participation and sensor setup |
| D1 | RPSGT-B4-R008 | D1-C1 | PAP claustrophobia and awake acclimatization |
| D1 | RPSGT-B6-S105 | D1-C2 (provisional) | Oxygen tubing/mobility safety and patient education |
| D2 | RPSGT-B2-M045 | D2-A4 | PAP equipment/channel verification before titration |
| D2 | RPSGT-B4-R011 | D2-A4 | PAP device airflow channel during titration |
| D2 | RPSGT-MOCK-D2-058 | D2-A4 (provisional) | Digital reference and retrospective EEG remontaging |
| D2 | RPSGT-B3-C051 | D2-B1 | Current titration order versus home-device settings |
| D2 | RPSGT-B3-C053 | D2-B1 | Out-of-bed and lights-on/off interval documentation |
| D2 | RPSGT-B3-C069 | D2-C3 | Fall-risk and sensor-cable entanglement |
| D2 | RPSGT-B4-R023 | D2-C3 | PAP-to-PSG pressure feed / recording channel mismatch |
| D3 | RPSGT-B2-M084 | D3-A3 | SpO₂ decline, reliability and event criteria |
| D3 | RPSGT-B2-M086 | D3-A6 (provisional) | Cardiac observation, ECG validity and escalation |
| D3 | RPSGT-B2-M089 | D3-A3 | Respiratory sensor artifact versus true apnea |
| D3 | RPSGT-B2-M090 | D3-A1 | Neurophysiologic sleep staging and stage context |
| D3 | RPSGT-B3-C104 | D3-C1 | HSAT REI labeling and 72 events / 9 hours = 8/h |
| D3 | RPSGT-B4-R090 | D3-C2 (provisional) | AASM optimal PAP titration RDI <5/h and supine REM |
| D4 | RPSGT-B2-M123 | D4-A3 | Adult CPAP event-driven titration |
| D4 | RPSGT-B2-M124 | D4-A3 | Pediatric age-specific CPAP maxima (AASM 2008) |
| D4 | RPSGT-B2-M129 | D4-A3 | OHS and NIV pressure support versus CPAP |
| D4 | RPSGT-B3-C147 | D4-C1 | Oxygen added when SpO₂ ≤88% ≥5 min without obstruction |
| D4 | RPSGT-B4-R069 | D4-C1 | Oxygen increments 1 L/min with ≥15 min between |
| D4 | RPSGT-B4-R071 | D4-C1 | Oxygen target SpO₂ 88%–94% during PAP titration |

The domain distribution is **D1=6, D2=7, D3=6, D4=6**.
No additional queued RPSGT manual-review questions were available under D3B
or D4B during selection.

## Structural and integrity checks

- All **25/25** JSON proposals valid, with four distinct answer options.
- All **25/25** include four choice-specific explanations, substantive
  correct-answer rationale, proposed blueprint subtask and references.
- All **25/25** answer indexes match the stored correct-answer text.
- All **25/25** explicitly say `draft-not-learner-eligible`.
- All **25/25** retain an APA7/exact-locator hold.
- All **25/25** original source hashes preserved.
- **Six** draft reference-status fields explicitly identify AASM V3 or licensed
  scoring-manual verification as outstanding.
- **Three** explicit provisional blueprint mappings remain for owner review.
- **No clinical or owner approvals** exist in this review process.

Structural QA is NOT a clinical fact check. Verify each applicable exact
AASM Version 3 rule and any version 3.1 errata, plus final bibliography
before readiness or release.

## Clinical/reference issues to resolve

1. **AASM 2008 supplemental oxygen procedure, sections 4.4.5.1–4.4.5.3**
   is the direct primary source for the 1 L/min initial flow, subsequent
   increments of 1 L/min with intervals ≥15 minutes, and saturation
   target 88%–94%. These are guidelines for authorized PAP titration,
   not self-directed oxygen changes.
2. **Pediatric PAP pressure maxima** in that guideline are 15 cm H₂O
   for children younger than 12 and 20 cm H₂O for 12 or older.
   Review pediatric clinical applicability and protocol before approval.
3. **Obesity hypoventilation** uses ATS 2019 guidance: suspected high-
   probability OHS involves awake PaCO₂ assessment; CPAP is first-line
   for stable OHS with coexisting severe OSA, whereas NIV selection
   depends on phenotype and response. Do not imply every person with
   OHS automatically requires bilevel PAP.
4. **HSAT REI:** Reporting based on valid monitoring time should be
   differentiated from PSG AHI based on sleep time. Certain PAT systems
   use different reporting conventions. Confirm licensed AASM V3 section.
5. **AASM V3:** Direct licensed passage verification remains required for
   oximetry event association, cardiac event classification, sleep-stage
   transitions, sensor choices during titration and HSAT reporting.
6. **Blueprint holds:** The original `D2A/D2C` mapping in
   `RPSGT-MOCK-D2-058` remains unchanged. Proposed D1-C2 for oxygen
   tubing education, D3-A6 for cardiac observation and D3-C2 for optimal
   titration grading require explicit reviewer decision.
7. **Specific-source gaps:** Pediatric caregiver participation, equipment
   fall risk and device-specific digital re-reference or pressure-channel
   setup need directly applicable sources beyond generic guideline links.
8. **APA 7:** Some candidate references use `et al.`; verify the complete
   author lists, publication years, page ranges, URLs/DOIs and section
   locators. Draft citations are not finished student citations.
9. **Potential educational duplication:** The oxygen titration topics and
   PAP desensitization overlap earlier rehabilitation batches. Before any
   owner approval, compare all candidate stems and learning objectives to
   distinguish intentional skills reinforcement from duplicate questions.

## Primary bibliography candidates (unapproved)

- Kushida, C. A., Chediak, A., Berry, R. B., Brown, L. K., Gozal, D.,
  Iber, C., Parthasarathy, S., Quan, S. F., & Rowley, J. A. (2008).
  Clinical guidelines for the manual titration of positive airway pressure
  in patients with obstructive sleep apnea. *Journal of Clinical Sleep
  Medicine, 4*(2), 157–171. https://pmc.ncbi.nlm.nih.gov/articles/PMC2335396/
- Mokhlesi, B., et al. (2019). Evaluation and management of obesity
  hypoventilation syndrome: An official American Thoracic Society
  clinical practice guideline. *American Journal of Respiratory and
  Critical Care Medicine, 200*(3), e6–e24.
  https://doi.org/10.1164/rccm.201905-1071ST
- Kapur, V. K., Auckley, D. H., Chowdhuri, S., Kuhlmann, D. C., Mehra, R.,
  Ramar, K., & Harrod, C. G. (2017). Clinical practice guideline for
  diagnostic testing for adult obstructive sleep apnea.
  *Journal of Clinical Sleep Medicine, 13*(3), 479–504.
  https://doi.org/10.5664/jcsm.6506
- American Academy of Sleep Medicine. (2023). *The AASM manual for the
  scoring of sleep and associated events: Rules, terminology and technical
  specifications* (Version 3). [Licensed text check pending.]
- American Association of Sleep Technologists. (2021).
  *Standard polysomnography* [Technical guideline].
  https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf
- Board of Registered Polysomnographic Technologists. (n.d.).
  *RPSGT exam blueprint*. https://brpt.org/rpsgt/exam-blueprint/

The APA bibliography above is NOT an approval-ready learner export.

## GitHub (draft PR #155)

- `migrations/0007_question_rehab_batch5_2026_11_09.sql`
- `scripts/rpsgt-question-rehab-batch5-qa.sql`
- `docs/RPSGT-QUESTION-REHAB-BATCH5-2026-11-09.md`

Do not merge, deploy or promote these drafts to the learner-facing bank
without independent clinical and reference checks, APA finalization,
owner approval and app parity tests.
