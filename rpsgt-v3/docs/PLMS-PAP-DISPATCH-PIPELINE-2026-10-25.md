# Sleep Pathways Guild — PLMS/PAP question delivery

**Date:** 2026-10-25  
**System:** RPSGT V3 (not the separately deployed V2 or CPSGT webapps)

## Why the original D1 inserts did not reach learners

The owner-approved four-item PLMS/PAP batch was inserted only into the development
D1 table `spg_rpsgt_question_proposals`. That table is deliberately a staging/
audit store and is **not** queried by the static RPSGT webapp. Approval records in
GitHub were likewise outside the app's learner-serving question loader. Thus
clinical approval did not dispatch the content.

## Actual delivery path added

```text
D1 staging row + version-pinned GitHub question proposal
  -> explicit owner clinical approval (recorded)
  -> semantic-family / blueprint / saved-history / publication QA gates
  -> scripts/dispatch-owner-questions.mjs --publish
  -> data/owner-question-dispatch.json (published question payload)
  -> core/owner-question-release.js (merge after the existing base release)
  -> decorated D2B / D2C module, manifest, feedback index, and blueprint
  -> RPSGT V3 Study, Practice, Readiness (Mock separately curated)
```

The serving endpoint is a **deployed, static JSON manifest**, not a browser-side
direct connection to the private D1 database. No database password, API token,
admin button, or other credential is exposed to learners.

The canonical 2,920 extracted source records, the earlier 320 approved additions,
their IDs, existing progress stores and report records remain unchanged.

## Current state

- Four original Guild questions, original IDs and owner-verified clinical content
- Owner clinical approval on 2026-10-25, with per-item SHA-256 hashes
- `data/owner-question-dispatch.json`: `status: "held"`, `questions: []`
- `qaGates.ownerClinicalApproved` and `sourcePassagesReviewed`: true
- `semanticFamilyReviewCompleted`, `blueprintTaskPlacementConfirmed`,
  `representativeLearnerHistoryRegressionPassed`,
  `ownerPublicationAuthorized`: **false**
- Deployed learner count **unchanged** until a signed, QA-complete dispatch is published
- Not a V3 public launch authorization; independently validate deployment

## Dispatch command

From a checkout of the repository:

```sh
node rpsgt-v3/scripts/dispatch-owner-questions.mjs --check
```

The command reports outstanding gates and verifies the proposal/approval hashes
against existing source and owner-release IDs. It does not alter any files.

After evidence for all independent checks has been reviewed, record that evidence,
obtain separate owner publication authorization, and update **only gates actually
completed** in `rpsgt-v3/data/owner-question-dispatch.json`:

```sh
node rpsgt-v3/scripts/dispatch-owner-questions.mjs --publish
node rpsgt-v3/scripts/test-owner-question-release.mjs
node rpsgt-v3/scripts/validate-question-bank.mjs
```

`--publish` refuses incomplete gates, altered clinical wording or duplicate IDs;
it copies exactly the four approved proposals into the serving manifest and
marks the dispatch published. It retains the previously approved clinical
answer/rationale/APA content, clears the release holds only in the served copies,
and keeps `mockEligible: false` until mock suitability is separately assessed.
The learner app then reads the dispatch JSON automatically as part of its normal
question loader; there is no manual pasting into each app.

**Do not set gates true merely to make the command succeed.** In particular,
representative browser learner history is not available solely from repository
unit tests. No automatic promotion occurs from D1's proposed status or from an
LMS admin section that has not yet been implemented.

## D1 lifecycle reconciliation

The D1 proposal table intentionally restricts `publication_status` to
`proposed-not-learner-eligible` and is an immutable editorial-inbox snapshot;
it is not a public dispatch API. Publication should be separately recorded
in an auditable release/dispatch ledger using the approved question IDs and the
deployed Git commit/version. Updating D1 editorial status is **not** what triggers
the static learner app. A future LMS Question Approval Center can initiate this
same vetted dispatch operation on a protected backend.

## Proof and source of truth

- `data/question-proposals/OWNER-PLMS-PAP-CLINICAL-APPROVAL-2026-10-25.json`
- `data/question-proposals/plms-pap-titration-2026-10-25.json`
- `data/owner-question-dispatch.json`
- `core/owner-question-release.js`
- `scripts/dispatch-owner-questions.mjs`
- `scripts/test-owner-question-release.mjs`
- `scripts/test-plms-pap-owner-approval-2026.mjs`

The four questions are **RPSGT-specific**. This does not insert or remap them into
the CPSGT webapp. RPSGT V2 integration would require a separate vetted delivery
path and its existing learner-history tests.
