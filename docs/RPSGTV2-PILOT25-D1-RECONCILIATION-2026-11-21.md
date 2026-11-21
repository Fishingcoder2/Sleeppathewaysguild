# D1 live read-only reconciliation — 2026-11-21

Database: `sleep_pathways_tutor_dev`, queried using SELECT only. Scope: pilot batch `RPSGT-REHAB-2026-11-08-P25`.

## Critical verified discrepancy
- 25/25 rows have `review_state='owner-approved'`, `approved_by='Owner direction via ChatGPT, 2026-11-11'`, and an `approved_at` timestamp.
- 25/25 simultaneously have `clinical_verification='draft-needs-independent-review'`.
- 25/25 proposed payloads still have `publication_status='draft-not-learner-eligible'`.
- 25/25 canonical originals have `learner_excluded=0` and `publication_status='published-learner-eligible'`. This describes D1 shadow records, not proof of V2 live-app exposure.
- Thus earlier statements of zero owner approvals are stale relative to D1; there is an owner-attributed approval, but it is not a clinical/source/release approval. **Never treat review_state alone as permission to publish.**

## Original versus proposed answer-concept comparison
- `RPSGT-B2-M008`: original STOP-Bang screens for OSA risk; draft contrasts high STOP-Bang with low Epworth and emphasizes objective testing. Broader clinical decision; not a simple copy.
- `RPSGT-B2-M041`: original and draft both key nasal pressure transducer; draft adds sensor differentiation. Exact AASM V3 wording remains pending.
- `RPSGT-B2-M023` and `M024`: original PAP introduction vs desensitization; draft scenarios both include awake interface acclimatization. Potential concept-family overlap, not established duplicate.
- `RPSGT-B2-M101`: original conceptual total sleep time; draft computes 500 × 30 seconds = 250 minutes.
- `RPSGT-B2-M102`: original definition of sleep latency; draft computes 22:00 to 22:17:30 = 17.5 minutes.
- `RPSGT-B2-M112`: original pressure support = IPAP − EPAP; draft 16 − 10 = 6 cm H2O.
- `RPSGT-B2-M146` and `M147`: oxygenation/ventilation distinction vs oxygen use in PAP; verify source scope and avoid conflating supplemental oxygen with ventilation treatment.
- `RPSGT-MOCK-D2-051`: task placement remains a held D2A/D2C issue.

## Mandatory gate correction
Require explicit independent clinical verification, exact approved source passage, BRPT task/subtask edition, semantic duplicate disposition, and separate release eligibility checks even when `review_state='owner-approved'`. Investigate whether the November 11 approval attribution represents a broad instruction rather than item-level content signoff. Preserve current records; do not overwrite approval history or change eligibility without reconciliation.

## Limitations
The database original/draft records were read directly; full source-passage clinical review and cross-bank semantic duplicate analysis remain outstanding. No database writes, app edits, merges or deployment performed.
