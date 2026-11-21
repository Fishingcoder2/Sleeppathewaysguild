# RPSGTv2 pilot 25 — comparison findings (2026-11-21)

**Scope:** Comparison of owner-selected GitHub pilot audit and intake SQL against its own review requirements. This is NOT a text-level comparison of original and proposed question payloads: neither complete payload was retrieved in this check.

## Verified structural comparison
| Dimension | Original pilot | Proposed pilot drafts | Conclusion |
|---|---|---|---|
| Four answer options and matching keyed answer | 25/25 per initial audit | 25/25 per later QA | Structural consistency only; clinical correctness unverified |
| Rationale length | 24/25 original rationales <120 characters | Drafts reported expanded | Improvement reported; full text not independently compared |
| Individual distractor explanations | 0/25 originals | 25/25 drafts per later QA | Reported coverage gain; correctness unverified |
| Source hashes | 539/539 canonical originals matched intake in historical QA | Drafts staged separately | Historical integrity assertion, not a fresh D1 check |
| Clinical approval | Not established | 0/25 | HOLD |
| Exact passage and APA 7 | Not established | Pending for 25/25 | HOLD |
| Eligibility | Original D1 provenance flags are not automatic exclusion | 25/25 draft-not-learner-eligible | Do not alter current V2 or original D1 eligibility |

## High-risk conceptual comparisons
- `RPSGT-B2-M023` versus `RPSGT-B2-M024`: PAP acclimatization and desensitization may overlap; compare learning objectives and answer rationales before accepting both.
- `RPSGT-B2-M146` versus `RPSGT-B2-M147`: oxygenation/ventilation versus supplemental oxygen during PAP; distinguish physiological concepts from protocol-specific titration requirements.
- `RPSGT-B2-M101` versus `RPSGT-B2-M102`: both calculations, but total sleep time (500 epochs × 30 sec = 250 min) and sleep latency (22:00 to 22:17:30 = 17.5 min) test distinct skills, not proven duplicates.
- `RPSGT-B2-M041` versus `RPSGT-B2-M063`: respiratory sensors versus event classification; source-rule wording and conceptual overlap need review.
- `RPSGT-MOCK-D2-051`: D2A/D2C unresolved; never auto-remap.
- `RPSGT-B2-M112`: pressure support arithmetic (16 − 10 = 6 cm H2O) can be checked mathematically, but this does not verify the complete keyed question or clinical context.

## Blocker and next action
Fetch the original 25 canonical question payloads and the 25 `spg_question_rehab_reviews.proposed_rewrite_json` records read-only, using an approved D1 access path. Compare stems, all four options, keyed answers, rationales, approved source passage locators, and duplicate semantic families. The GitHub report and SQL intake only contain IDs, descriptions, and QA assertions. No clinical sign-off, source approval, remap, eligibility change, merge or deploy is justified.
