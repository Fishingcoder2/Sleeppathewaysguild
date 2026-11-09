# RPSGT V3 — Question rehabilitation pilot and D1 audit (2026-11-08)

## Purpose

Improve the 539 RPSGT questions carrying `manual_review_recommended = 1` in
Cloudflare D1 (`sleep_pathways_tutor_dev`). Preserve original records,
learning progress, release counts, and provenance. **Editorial staging is not
clinical approval and does not change a learner's experience.**

## Verified intake snapshot

| Scope | Count |
| --- | ---: |
| Total RPSGT questions in D1 | 3,240 |
| RPSGT manual-review provenance flags | 539 |
| Flagged D1 | 42 |
| Flagged D2 | 116 |
| Flagged D3 | 207 |
| Flagged D4 | 174 |
| Flagged questions Practice-eligible in D1 | 534 |
| Flagged questions Mock-eligible in D1 | 439 |
| Pilot D1 / D2 / D3 / D4 | 5 / 7 / 7 / 6 |
| Pilot total | 25 |
| Remaining queued | 514 |

**Important:** These are D1 shadow-bank flags, not automatically a learner hold.
`docs/D1-QUESTION-BANK-MIGRATION-2026-10-26.md` explicitly describes
`manual_review_recommended` as provenance after owner-approved release, and
states that static learner apps have not cut over to D1. Earlier V3 source
documents describe a different static hold population. Never infer actual
live learner exposure solely from D1 eligibility columns.

## Non-destructive schema

- `migrations/0002_question_rehab_reviews.sql`: new
  `spg_question_rehab_reviews` table for source hashes, queue/batch priority,
  review gates, proposed text, and approval metadata.
- `migrations/0003_question_rehab_intake_2026_11_08.sql`:
  idempotent flagged-item intake and deterministic pilot allocation.
- Original questions remain in `spg_questions`, with import snapshots in
  `spg_question_versions`. No question contents or eligibility were altered.
- `proposed_rewrite_json` is an **internal-only** draft payload. It must
  not be read as an active release.
- The existing `spg_question_editor_drafts` is owner/user-attributed. The
  rehab table avoids falsely assigning AI-generated work to a user.

## Pilot identifiers (stable question IDs)

- **D1 (5):** `101`, `RPSGT-B2-M003`, `RPSGT-B2-M008`,
  `RPSGT-B2-M014`, `RPSGT-B2-M020`
- **D2 (7):** `RPSGT-B2-M038`, `RPSGT-B2-M040`,
  `RPSGT-B2-M041`, `RPSGT-B2-M042`, `RPSGT-B2-M044`,
  `RPSGT-B2-M045`, `RPSGT-B2-M048`
- **D3 (7):** `RPSGT-B2-M072` through `RPSGT-B2-M078`
- **D4 (6):** `RPSGT-B2-M110`, `RPSGT-B2-M111`,
  `RPSGT-B2-M112`, `RPSGT-B2-M114`, `RPSGT-B2-M115`,
  `RPSGT-B2-M116`

## First three proposed rewrites (D1 draft records)

These are stored in `spg_question_rehab_reviews.proposed_rewrite_json`, with
`review_state = 'rewrite-drafted'`, and remain unavailable to learners:

1. `RPSGT-B2-M008`, D1–A7: interpret elevated STOP-Bang in the context of a
   low Epworth score. Supports the distinction between screening and diagnosis,
   based on the AASM 2017 adult OSA diagnostic testing guideline and current BRPT
   blueprint.
2. `RPSGT-B2-M041`, D2–A4: distinguish nasal pressure (flow contour/hypopneas)
   from thermal airflow (apneas), respiratory effort, and PAP-device flow.
   AAST guideline channels have been checked; **licensed AASM Scoring Manual
   Version 3 respiratory sensor wording still needs direct verification**.
3. `RPSGT-B2-M112`, D4–A3: calculate pressure support from IPAP 16 and EPAP
   10 cm H2O. Uses the AASM manual PAP titration guideline, not the AAST
   diagnostic-PSG guideline (which excludes therapeutic titration).

Clinical review and owner approval remain pending for all three.

## Locked review gates

1. Preserve source question ID and source content hash; never overwrite the
   original on draft generation.
2. Verify exact BRPT current domain, task, subtask number and edition; do not
   infer from a vague topic label.
3. Check the actual answer against the **applicable** primary standard.
   AASM Scoring Manual Version 3 governs scoring/technical requirements;
   clinical guidelines govern diagnostic workup, titration, treatments and
   patient assessment as appropriate. AAST guidance is limited by its scope.
4. Rewrite only when needed: ambiguous stem, weak distractors, multiple valid
   answers, outdated criteria, wrong answer, or shallow rationale.
5. Provide four defensible options, rationale for the correct answer, why each
   other answer fails, clinical nuance/exception, and APA 7th references with
   source edition and section/locator.
6. If a licensed rule passage is not accessible for direct verification, keep
   `reference_verification` partial and leave approval blocked. A mapped source
   key or external summary is **not** passage-level verification.
7. Owner review is a separate explicit gate. No D1 draft is published by
   modifying a review-status field alone; release must pass existing canonical
   release, parity, and learner-eligibility gates.
8. Student-facing material shows APA-style references, **not** internal
   'mapped reference' source-routing terminology.

## Citation anchors checked for initial drafts

- Board of Registered Polysomnographic Technologists. (n.d.). *RPSGT
  examination blueprint*. https://brpt.org/rpsgt/exam-blueprint/
- American Association of Sleep Technologists. (2021). *Standard
  polysomnography* [Technical guideline].
  https://aastweb.org/wp-content/uploads/2025/03/AAST-PSG-Guideline-Final.pdf
- Kapur, V. K., et al. (2017). Clinical practice guideline for diagnostic
  testing for adult obstructive sleep apnea. *Journal of Clinical Sleep
  Medicine, 13*(3), 479–504. https://doi.org/10.5664/jcsm.6506
- Kushida, C. A., et al. (2008). Clinical guidelines for the manual titration
  of positive airway pressure in patients with obstructive sleep apnea.
  *Journal of Clinical Sleep Medicine, 4*(2), 157–171.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC2335396/

## Next checks

- Record structured distractor/blueprint/clinical triage for the other 22.
- Obtain exact, versioned AASM scoring-source passages before approving D2/D3
  scoring-rule items.
- Review all 25 against duplicated questions and evidence anchors.
- After owner approval, use the existing release/parity process, and confirm
  static V2/V3, CPSGT, Mock, Readiness and learner reports do not regress.
