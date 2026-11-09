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

## Balanced pilot identifiers (stable source IDs)

All 12 current BRPT RPSGT tasks are represented, plus an unresolved D2A/D2C
cross-task item. The cross-task record remains unassigned for LMS purposes.

- **D1 (5):** A: `RPSGT-B2-M003`, `RPSGT-B2-M008`; B:
  `RPSGT-B2-M020`, `RPSGT-B2-M023`; C: `RPSGT-B2-M024`
- **D2 (7):** A: `RPSGT-B2-M038`, `RPSGT-B2-M041`; B:
  `RPSGT-B2-M048`, `RPSGT-B2-M049`; C: `RPSGT-B2-M063`,
  `RPSGT-B2-M064`; unresolved A/C: `RPSGT-MOCK-D2-051`
- **D3 (7):** A: `RPSGT-B2-M072`, `RPSGT-B2-M073`,
  `RPSGT-B2-M074`; B: `RPSGT-B3-C099`, `RPSGT-B3-C101`;
  C: `RPSGT-B2-M101`, `RPSGT-B2-M102`
- **D4 (6):** A: `RPSGT-B2-M110`, `RPSGT-B2-M112`;
  B: `RPSGT-B2-M138`, `RPSGT-B2-M140`;
  C: `RPSGT-B2-M146`, `RPSGT-B2-M147`

## Automated first-pass audit

- 25 of 25: four answer options and matching keyed answer.
- 24 of 25: original rationale shorter than 120 characters.
- 25 of 25: no individual distractor rationales.
- 3 of 25: proposed rewrite JSON present; still non-published drafts.
- 22 of 25: editorial issues triaged, source passages/clinical conclusions
  **not yet manually verified**.
- All 539 review source hashes match the existing D1 canonical question hashes.
- No source answer, publication status, eligibility, or learner records changed.

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

- Complete independent source, distractor, and blueprint review of the remaining 22 pilot items.
- Obtain exact, versioned AASM scoring-source passages before approving D2/D3
  scoring-rule items.
- Review all 25 against duplicated questions and evidence anchors.
- After owner approval, use the existing release/parity process, and confirm
  static V2/V3, CPSGT, Mock, Readiness and learner reports do not regress.

## Additional staged draft progress — November 9, 2026

The D1 shadow-bank review table now also contains non-published rewrite proposals for:

- `RPSGT-B2-M023`, D1 B: PAP education and interface acclimatization.
- `RPSGT-B2-M024`, D1 C: PAP desensitization.
- `RPSGT-B2-M038`, D2 A: adult diagnostic PSG montage.
- `RPSGT-MOCK-D2-051`, unresolved D2 A/C: physiological calibration; D2-C6 is proposed **only**, not an automatic remap.
- `RPSGT-B2-M101`, D3 C: calculating total sleep time from 500 sleep epochs at 30 seconds each (250 minutes).
- `RPSGT-B2-M102`, D3 C: calculating sleep latency from 22:00:00 lights out to 22:17:30 sleep onset (17.5 minutes).

These join the three original proposals, totaling **9 draft rewrites**, while 16 pilot
questions remain in triage and 514 flagged questions remain queued.

**All nine rewrites remain pending independent clinical, exact-section citation,
and owner review.** Some reference locations remain provisionally mapped,
particularly in the licensed AASM Scoring Manual Version 3; mapping does not
constitute direct passage-level verification. No published/eligible record was
replaced or excluded, and learner-facing scoring remains unchanged.

## Completed 25-question draft pilot — November 9, 2026

The remaining 16 flagged items were reviewed and rewritten into **non-published**
`spg_question_rehab_reviews.proposed_rewrite_json` records, covering:

- **D1:** `RPSGT-B2-M003` — OSA symptoms, diagnostic role;
  `RPSGT-B2-M020` — pediatric family-centered preparation.
- **D2:** `RPSGT-B2-M048` — adult diagnostic PSG parameters;
  `RPSGT-B2-M049` — pediatric PSG setup;
  `RPSGT-B2-M063` — airflow/effort event classification;
  `RPSGT-B2-M064` — ECG finding and escalation.
- **D3:** `RPSGT-B2-M072` — wake alpha;
  `RPSGT-B2-M073` — typical N1 transition;
  `RPSGT-B2-M074` — spindle morphology;
  `RPSGT-B3-C099` — pediatric SpO2 artifact;
  `RPSGT-B3-C101` — pediatric ECG concern.
- **D4:** `RPSGT-B2-M110` — CPAP versus BPAP;
  `RPSGT-B2-M138` — physician-dentist oral-appliance treatment;
  `RPSGT-B2-M140` — adenotonsillectomy in appropriate pediatric OSA;
  `RPSGT-B2-M146` — oxygenation versus ventilation;
  `RPSGT-B2-M147` — protocol-directed supplemental O2 during PAP titration.

**Reproducible read-only database QA:** `scripts/rpsgt-question-rehab-qa.sql`.

### Validated D1 state

- **539** flagged RPSGT question IDs tracked: **25 rewrite-drafted**, **514 queued**.
- **25 / 25** draft JSON payloads valid; four choices and four explanations.
- **25 / 25** correct-answer strings match the specified answer index.
- **25 / 25** drafts explicitly marked `draft-not-learner-eligible`.
- **539 / 539** original D1 question hashes still match their rehabilitation intake hashes.
- **25 / 25** clinical approvals outstanding.
- **8** drafts have a review status explicitly identifying AASM Scoring Manual Version 3
  passage verification as pending. Other drafts still require independent verification
  and owner approval even where a primary guideline section has been located.
- **1** unresolved cross-task D2A/D2C record remains blocked from automatic remapping.

### Primary reference boundary

The AASM Scoring Manual Version 3 is licensed and read-only through the AASM portal.
Accessible summaries, reference keys, and auxiliary sources are **not** the same
as verifying the exact licensed text. No rule-sensitive question can be approved
until a qualified reviewer checks that passage. The AAST *Standard Polysomnography*
guideline explicitly excludes pediatric PSG and therapeutic titration; those topics
must use appropriate pediatric, PAP titration, or other domain-specific guidance.

None of these drafts have replaced a canonical question or been incorporated into a
student-facing release. **Do not merge this draft PR as a question-content release.**
