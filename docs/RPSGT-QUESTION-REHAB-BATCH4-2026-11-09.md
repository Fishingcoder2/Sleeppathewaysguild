# Sleep Pathways Guild RPSGT — Question Rehabilitation Batch 4

Date: November 9, 2026  
Batch: `RPSGT-REHAB-2026-11-09-P25-B4`  
Cloudflare D1: `sleep_pathways_tutor_dev`  
Status: **25/25 non-published editorial drafts; 0 clinical/owner approvals**.

## Four-batch progress

| Review state | Count |
| --- | ---: |
| Initial flagged RPSGT manual-review provenance records | 539 |
| Batch 1 rewrites in D1 review drafts | 25 |
| Batch 2 rewrites | 25 |
| Batch 3 rewrites | 25 |
| Batch 4 rewrites | 25 |
| **Total rewrite proposals** | **100** |
| **Remaining queued** | **439** |

This is draft progress, **not** publication or clinical verification progress.
No `spg_questions`, answer keys, learner eligibility, versions,
release records, or web app question files were changed.

## Original IDs and review topics

| Domain / subtask | Question ID | Revised focus |
| --- | --- | --- |
| D1-A1 | RPSGT-B3-C008 | MSLT readiness: insufficient previous-night PSG sleep |
| D1-A4 | RPSGT-MOCK-D1-091 | REM-modulating medication, MSLT and documentation |
| D1-B2 | RPSGT-B4-R007 | PAP fitting and awake acclimatization |
| D1-B3 | RPSGT-B6-S108 | Explaining an EEG arousal without diagnosing |
| D1-C1 | RPSGT-B3-C022 | Patient-centered PAP desensitization |
| D1-C2 | RPSGT-B4-R150 | Post-titration equipment and follow-up education |
| D2-A4 | RPSGT-B4-R013 | Oximeter averaging and desaturation waveform |
| D2-A2 | RPSGT-B3-C035 | Child-sized airflow interface and signal checking |
| D2-A/C unresolved | RPSGT-MOCK-D2-061 | Nasal cannula artifact; proposes D2-C2 only |
| D2-B1 | RPSGT-B2-M054 | Lights-out documentation and timing |
| D2-B4 | RPSGT-B3-C048 | MWT patient instructions versus MSLT |
| D2-C2 | RPSGT-B3-C059 | ECG electrode artifact versus arrhythmia |
| D2-C2 | RPSGT-B3-C062 | Pulse-oximeter motion artifact / signal loss |
| D3-A3 | RPSGT-B2-M080 | Central apnea: absent effort throughout |
| D3-A3 | RPSGT-B2-M083 | Respiratory effort-related arousal (RERA) |
| D3-A5 | RPSGT-B2-M085 | Leg EMG and PLMS scoring-series criteria |
| D3-A → proposed D3-C1 | RPSGT-B2-M087 | PSG AHI calculation (45 events / 4.5 h = 10/h) |
| D3-C3 | RPSGT-B2-M106 | Hypnogram and sleep-stage progression |
| D3-C1 | RPSGT-B3-C103 | AHI 10/h versus RDI 12/h from 60 + 12 RERAs / 6 h |
| D4-A3 | RPSGT-B2-M114 | BPAP pressure support rises 4 → 6 cm H₂O |
| D4-A5 | RPSGT-B2-M126 | Assess leak before changing PAP pressure |
| D4-B1 | nm-041 | Custom titratable oral appliance and follow-up |
| D4-B2 | RPSGT-B3-C143 | Limits of positional therapy as PAP alternative |
| D4-C1 | RPSGT-B4-R068 | AASM PAP titration oxygen start 1 L/min |
| D4-C2 | RPSGT-B3-C148 | Improved SpO₂ can coexist with worsening CO₂ |

Domain distribution: **D1=6, D2=7, D3=6, D4=6**. Every
task category with still-queued questions is represented; D3 Task B has
no further queued questions in this source population at this stage.

## Verified draft structure and intake preservation

- All 25 candidates: valid JSON, 4 distinct options, 4 individual
  explanations, matching answer key, lengthy rationale, proposed subtask,
  candidate references, and explicit `draft-not-learner-eligible` status.
- All 25: source content hashes still match unchanged original questions.
- All 25: `citation_qa=pending-formal-apa7-and-exact-locator-check`.
- **No independent clinician or owner approvals are recorded**.
- Keep the provenance review flag distinct from learner exclusion: historical
  D1 shadow-bank documentation explicitly says `manual_review_recommended`
  is a provenance flag, not an enforced hold or proof of active webapp exposure.

## Significant editorial corrections and blockers

1. **Oxygen starting flow:** Source `RPSGT-B4-R068` had attributed its
   oxygen starting flow to an AAST PAP summary. The draft cites the
   **AASM 2008 manual PAP titration guideline Section 4.4.5.1–4.4.5.3**,
   which specifies the minimum **1 L/min** initial oxygen rate and
   subsequent 1 L/min increases at no less than 15-minute intervals,
   under the specified clinical criteria. Do not generalize the threshold
   to other treatment settings without orders and applicable protocols.
2. **AASM V3 licensed source:** 8 items have reference-status strings
   expressly identifying pending AASM V3 source verification, and other
   draft claims require the same scrutiny as relevant. AASM scoring
   rules for apnea, RERA, limb movements, index calculations, oximetry
   specifications and pediatric signals must be checked in the
   licensed AASM Version 3 text before approval.
3. **Blueprint mapping:** `RPSGT-MOCK-D2-061` still has original
   `D2A/D2C` and proposed `D2-C2` only.
   `RPSGT-B2-M087` remains originally mapped to `D3A` with
   proposed `D3-C1` due to calculation focus. No canonical task changed.
4. **Pediatric sources:** The AAST *Standard Polysomnography* document
   excludes pediatric PSG, so the pediatric cannula-fit item needs
   pediatric AASM source review.
5. **Position therapy & hypoventilation:** `RPSGT-B3-C143` still
   needs a directly applicable positional-therapy primary study/guideline;
   `RPSGT-B3-C148` needs a relevant hypoventilation/oxygen
   guideline and clinical safety protocol beyond adult diagnostic AAST.
6. **APA 7:** Confirm names, order, journal volume/issue/pages, DOI,
   year/edition and exact source section. Candidate references are
   not final student citations.

## Verified external guideline anchors

- Board of Registered Polysomnographic Technologists. (n.d.).
  *RPSGT exam blueprint*. https://brpt.org/rpsgt/exam-blueprint/
- American Association of Sleep Technologists. (2021).
  *Standard polysomnography* [Technical guideline].
  https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf
- Krahn, L. E., Arand, D. L., Avidan, A. Y., Davila, D. G., DeBassio,
  W. A., Ruoff, C. M., & Harrod, C. G. (2021). Recommended protocols
  for the Multiple Sleep Latency Test and Maintenance of Wakefulness
  Test in adults. *Journal of Clinical Sleep Medicine, 17*(12),
  2489–2498. https://doi.org/10.5664/jcsm.9620
- Kushida, C. A., Chediak, A., Berry, R. B., Brown, L. K., Gozal, D.,
  Iber, C., Parthasarathy, S., Quan, S. F., & Rowley, J. A. (2008).
  Clinical guidelines for the manual titration of positive airway
  pressure in patients with obstructive sleep apnea.
  *Journal of Clinical Sleep Medicine, 4*(2), 157–171.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC2335396/
- Ramar, K., Dort, L. C., Katz, S. G., Lettieri, C. J., Harrod, C. G.,
  Thomas, S. M., & Chervin, R. D. (2015). Clinical practice guideline
  for the treatment of obstructive sleep apnea and snoring with oral
  appliance therapy: An update for 2015. *Journal of Clinical Sleep
  Medicine, 11*(7), 773–827. https://doi.org/10.5664/jcsm.4858

These are reference candidates requiring final independent verification,
not approval-ready bibliography exports.

## GitHub deliverables (draft PR #155)

- `migrations/0006_question_rehab_batch4_2026_11_09.sql`
- `scripts/rpsgt-question-rehab-batch4-qa.sql`
- `docs/RPSGT-QUESTION-REHAB-BATCH4-2026-11-09.md`

**Do not merge as a learner-facing question-bank release.**
