# Sleep Pathways Guild — RPSGT clinical-content review and release policy

**Effective October 13, 2026 — issued by the Guild's sole owner and creator.**  
**Applies to:** RPSGT and CPSGT educational question creation, clinical-content revisions, source reviews and controlled question releases, unless a specific exam/credential body imposes a documented additional requirement.

## Clinical review authority

The Sleep Pathways Guild owner is a qualified sleep professional who self-reports the **RPSGT credential and a pediatric badge certificate**. The owner is the designated **sole professional clinical-content reviewer** of Guild-created educational questions. **No separate independent, external, or second professional reviewer is required by Guild policy.**

Do not invent or assert review by a nonexistent third party. The Guild may solicit additional expert reviews voluntarily, but such reviews are **optional** unless an actual outside contractual/accreditation requirement applies and is documented by name.

## Owner clinical signoff: auditable, item-specific

A question passes its **clinical review** gate once the owner explicitly approves the **final revised stem, all options and distractors, recorded correct answer, rationale and intended source/task mapping**, tied to stable question IDs, revision hashes and review date. Recording owner approval is different from merely creating a draft or initially authorizing a review process. Material later edits must receive renewed owner approval.

The owner's explicit October 13, 2026 reply following a direct question about personal approval of all seven final revised questions satisfies this gate **for those seven IDs only** at content commit `e7c432de65aeaeb1a1522bf6d4ca1e555c320a17`, as recorded in `OWNER-CLINICAL-ITEM-APPROVAL-2026-10-13.json`.

Do **not** silently extend this approval to the five existing question revisions or future additions.

## Separate non-personnel QA gates — still required

Clinical signoff does not imply that these other steps passed:

1. **Current source accuracy:** use appropriate controlling AASM, AAST, ICSD/BRPT authorities, with documented passage or official statement locators. Where a question hinges on the AASM Scoring Manual Version 3, verify relevant licensed scoring rules and errata before applying them. The reviewed nine-year-old pediatric respiratory scoring item `SPG-SPRIGGS-2026-008` currently remains held for this reason.
2. **Semantic/concept novelty:** compare the intended learning decision with the effective existing question bank, record decision-family comparisons and necessary disposition. The owner may perform this review. Automated exact/string similarity tests are evidence, not a complete content-equivalence decision.
3. **Learner-safety regression:** preserve old question IDs, legacy answers and original learner records. For content imports, test representative V2/V3 learner history, saved answers, Study, Practice, Readiness, Mocks and Reports against the same-origin data. Static tests alone do not close documented real-world migration requirements.
4. **Publication mechanics:** release only the vetted owner-approved items after all relevant gates pass. Keep release authorization separate from GitHub proposal merge. The V3 public-app launch has its own release-readiness gate.
5. **Duplicate retirements:** the 15 existing retirement candidates are not authorized for retirement and must remain active until a separate explicit owner decision.

A no-second-reviewer policy **must not** be treated as a universal bypass of scoring rules, source evidence, data-migration safeguards, or owner authorization.

## Terminology

- `OWNER_RPSGT_APPROVED`: qualified **owner** item review complete; **not** an independent outside review.
- `NOT_REQUIRED_BY_OWNER_POLICY_2026-10-13`: deprecated requirement for an independent second clinician. Does **not** mean an independent clinician has performed or passed a review.
- `PENDING`: another named check not yet evidenced; it can block publication regardless of clinical signoff.
- `proposed-not-learner-eligible`: content remains in a development proposal file and is excluded from public learner banks.

## Current seven-draft disposition

| Gate | Seven drafts |
| --- | --- |
| Qualified professional clinical review | **Approved by Guild owner (RPSGT + pediatric badge certificate, self-reported)** |
| Second independent clinical reviewer | **Not required by Guild policy** |
| Full concept-family semantic disposition | Pending |
| Licensed AASM Scoring Manual V3 pediatric rule for item `008` | Pending |
| Real saved learner history/report compatibility for new content | Pending |
| Authorized new questions actually added to public banks | **0 of 7** |

This policy replaces the earlier mandatory-independent-review condition wherever it appears in the historical October 12–13 approval and handoff records. Historical documents may retain the former language for audit provenance but must not be treated as current requirements. `OWNER-CONDITIONAL-APPROVAL-2026-10-13.json` contains the machine-readable release contract updated to reflect this decision.

**Never describe the Guild's internal second-reviewer policy as a BRPT/AASM requirement without authoritative documentation.**
