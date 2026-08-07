# RPSGT v3 Master Data Model + Question Rotation Architecture

Date: 2026-08-07  
Status: Phase 1/2 foundation  
Scope: `rpsgt-v3/` only; no structural changes to the stable public RPSGT app.

## Why this layer comes first

RPSGT v3 already has separate learner engines for Practice, Guided Trail, Readiness, Mock, Flashcards, Math Coach, Skills Labs, Reports, and Review. The current question bank also contains useful task/topic/source metadata. The problem is that each learning surface can make its own selection decisions, so repetition control, concept remediation, source provenance, and cross-tool recommendations cannot be consistent.

The master model makes the knowledge graph canonical. The Question Rotation Engine then consumes that shared graph and learner history.

## Canonical relationship

`BRPT Domain -> BRPT Task -> Study Target/Subtask -> Topic -> Concept Family -> Concept/Skill`

Every learner artifact connects to this chain:

- Question -> Concept -> Concept Family -> Topic -> Task -> Domain
- Flashcard -> Concept -> Concept Family -> Topic -> Task -> Domain
- Math Skill -> Concept(s) -> Concept Family -> Topic -> Task(s) -> Domain
- Lab Station -> Concept(s) -> Concept Family -> Topic -> Task(s) -> Domain
- Visual Asset -> Concept(s) -> Concept Family -> Topic -> Task(s) -> Domain
- Source -> linked to any artifact with an explicit source role

This lets Reports prescribe remediation by concept instead of only displaying percentages.

## Canonical files introduced

- `data/master-data-model.schema.json` — formal JSON Schema for the complete knowledge model.
- `data/master-data-registry.json` — canonical registry scaffold. It starts empty so we do not silently recast legacy metadata as verified knowledge.
- `core/question-rotation-engine.js` — central, mode-aware selection and learner-history engine.

Existing `data/question-bank/*.json` modules remain untouched and continue to be the active v3 bank until migration is verified.

## Entity IDs

IDs should be stable and human-auditable. Recommended conventions:

- Domain: `D1`, `D2`, `D3`, `D4`
- Task: `D1A`, `D1B`, etc.
- Topic: `topic:<task>:<slug>`
- Concept Family: `cf:<task>:<topic-slug>:<family-slug>`
- Concept: `concept:<task>:<family-slug>:<concept-slug>`
- Source: `src:<organization-or-author>:<short-title>:<version-or-year>`
- Visual: `vis:<category>:<slug>:<revision>`
- Flashcard: `fc:<concept-id>:<sequence>`
- Math Skill: `math:<skill-slug>`
- Lab Station: `lab:<lab-slug>:<station-slug>`

Legacy question IDs such as `imp-038` remain preserved as `legacyQuestionId` or as the canonical `questionId` until a controlled migration decides otherwise.

## Source roles are separate on purpose

A single generic citation list cannot safely answer three different questions:

1. What material helped develop this independently written question?
2. What source currently controls a rule-sensitive answer?
3. What resource should the learner study?

The schema therefore supports these roles:

- `questionDevelopment`
- `currentAuthority`
- `studySupport`
- `blueprintAlignment`
- `visualProvenance`

A source can carry more than one role, but the roles are stored explicitly.

## Source currency and verification

Currency values:

- `current`
- `current-version-dependent`
- `legacy-background`
- `superseded`
- `needs-verification`

Verification values:

- `verified`
- `partially-verified`
- `mapped-not-locator-verified`
- `needs-verification`
- `unresolved`

This prevents an older textbook or a broad topic mapping from silently overriding a current AASM, AAST, ICSD-3-TR, manufacturer, safety, physician-order, or laboratory-policy authority.

## Review status

Shared review values:

- `active`
- `sme-reviewed`
- `needs-review`
- `legacy`
- `duplicate-family-member`
- `retired`

The current bank's `qa.manualReviewRecommended` flag remains supported during migration.

## Concept families are the repetition-control unit

Question IDs only prevent exact repeats. Prompt normalization only catches superficial variants. The new control unit is `conceptFamilyId`.

Examples:

- Topic: Respiratory Event Scoring
- Concept Family: Obstructive vs Central Event Differentiation
- Concepts: effort present during airflow cessation; effort absent during airflow cessation; mixed pattern transition

Several different questions, visuals, flashcards, and lab stations can teach or test the same family without being duplicates.

## Legacy fallback before full migration

The current 2,887-record v3 modular bank does not yet contain canonical `conceptFamilyId` fields. The rotation engine therefore uses this safe fallback:

`legacy:<taskCode>:<normalized-topic>`

That immediately improves repetition control without pretending that topic-level grouping is the finished concept taxonomy. As concept families are curated, explicit `conceptFamilyId` values override the fallback automatically.

## Central Question Rotation Engine

File: `core/question-rotation-engine.js`

Selection priority:

1. unseen concept family
2. unseen question in a previously seen family
3. older reviewed/mastered question
4. recently seen mastered/reviewed question only when needed

Missed concepts are given spaced remediation. The engine prefers a fresh question from the same concept family rather than immediately repeating the exact missed stem.

### Mode defaults

Practice
- prefer unique concept families within a session
- 24-hour exact-question cooldown target
- remediation enabled

Guided Practice
- same general behavior as Practice
- caller can provide prior Guided Trail question IDs as exclusions

Guided Checkpoint
- prefer unique concept families
- 48-hour exact-question cooldown target
- can exclude the exact IDs used in the preceding Guided Trail practice

Readiness
- prefer unique concept families
- longer cooldowns
- remediation disabled inside the assessment itself

Mock
- hard concept-family uniqueness within selection when pool depth permits
- one-week exact-question cooldown target
- three-day concept-family cooldown target
- remediation disabled inside the exam
- blueprint quotas can be supplied through `selectByQuotas()`

## Rotation history model

The engine maintains a normalized history structure containing:

- `questionStats`
  - attempts
  - correct / incorrect
  - streak
  - last seen / correct / incorrect timestamps
  - mastered
  - remediation due timestamp
- `conceptStats`
  - same learning history at concept-family level
- `sessionHistory`
  - mode
  - question IDs
  - concept-family IDs
  - completion timestamp

This should eventually live under a new `questionRotation` branch in `spg_rpsgt_v3` storage. Storage should not be changed until the engine integration tests are ready, because current learner progress must remain backward-compatible.

## Mock Exam integration

The existing Mock engine already has useful protections: it filters manual-review records, excludes visual placeholders, applies difficulty heuristics, uses a normalized prompt-family dedupe, and preserves a 175-item structure. Those protections should not be discarded.

The next integration should layer the central rotation engine ahead of or inside mock selection:

1. filter to mock-eligible records using existing Mock rules
2. map canonical `conceptFamilyId` (fallback to legacy task/topic while migration is incomplete)
3. apply cross-exam cooldowns from rotation history
4. enforce scored-domain quotas
5. enforce hard concept-family uniqueness when bank depth permits
6. retain existing difficulty/task balancing
7. record the completed mock session back to central rotation history

Prompt-family normalization remains a secondary duplicate defense, not the primary concept identity.

## Practice integration

Current Practice uses `shuffle(pool).slice(0, size)`. Replace only that selection line after tests are in place:

- load the same eligible pool
- load central rotation history
- call `RPSGTQuestionRotationEngine.selectQuestions(pool, options)`
- preserve current answer recording, missed/mastered behavior, and quality-review isolation
- add `recordAttempt()` and `recordSession()` to rotation history

Quality Review should never update rotation history because those records are editorial, not learner attempts.

## Guided Trail integration

Current Guided Trail uses seeded shuffle and slice for checkpoints. Replace its `selectQuestions()` internals with the central engine while preserving its deterministic/testable interface.

The preceding Guided Practice session should pass its exact question IDs as `excludeQuestionIds`; concept families can be passed as `avoidConceptFamilyIds` rather than hard exclusions so a checkpoint may test the same learning objective with a different stem.

## Readiness integration

Readiness should use the same central history but assessment-oriented defaults:

- do not inject immediate remediation during the assessment
- prefer unseen/older material
- avoid recent exact stems
- maximize concept-family coverage
- write session history on completion

Missed concepts then feed remediation after the assessment.

## Reports and remediation

Once question records have canonical concept IDs, Reports can aggregate by:

`Domain -> Task -> Topic -> Concept Family -> Concept`

A weakness record should point to actionable resources:

1. curated flashcard
2. visual asset
3. lab station
4. Math Coach skill where applicable
5. mapped study-support source
6. current-authority source when rule-sensitive
7. fresh concept-family-controlled practice set

## Critical bank reconciliation before full migration

The current v3 staging README documents 2,887 modular questions. The 2026-08-07 rebuild handoff states that the repaired public RPSGT app subsequently received 33 approved source-fidelity questions, for an intended active total of 2,920.

Therefore the canonical migration must not assume the existing v3 modular bank is the latest complete source. Before the master registry becomes authoritative, reconcile the 33 approved additions into the v3 staging bank and verify:

- unique IDs
- task/domain mapping
- source roles
- concept-family assignment
- learner vs manual-review status
- mock/readiness eligibility
- duplicate-family membership

This reconciliation is a data task, not a UI task.

## Phase 1 migration sequence

1. Import the four domains and twelve direct BRPT-shaped tasks from `blueprint.json` into the canonical registry without changing their current app-authored wording.
2. Build a topic inventory from the existing modular bank.
3. Create concept families within each task/topic; do not auto-promote every topic to a final concept family without review.
4. Reconcile the 33 approved public-app additions.
5. Convert current `referenceKeys`, `sourceCredit`, and `studyRecommendationKeys` into explicit source links while preserving uncertainty.
6. Add specific concepts only where the distinction improves remediation, visuals, labs, math, or duplicate control.
7. Validate referential integrity across all IDs.
8. Only then migrate active learner engines to consume the registry.

## QA gates for the rotation engine

Automated tests should prove at minimum:

- no duplicate question IDs in a session
- Mock hard-family mode does not duplicate a concept family unless explicitly allowed by a fallback policy
- Practice prefers unseen families before seen families
- unseen questions are preferred before recently seen questions within a seen family
- older mastered questions outrank recently mastered questions
- a missed concept becomes remediation-eligible after the configured delay
- alternate questions in the missed concept family outrank immediate exact-stem repetition
- Guided Checkpoint exclusions prevent reuse of preceding Guided Practice question IDs
- quota selection preserves requested domain totals when sufficient eligible records exist
- manual-review/retired records are never learner-selected
- Quality Review remains isolated from learner rotation history
- legacy task/topic fallback is deterministic

## Boundary decisions

- Do not overwrite the old RPSGT app.
- Do not structurally alter the repaired public RPSGT app during this phase.
- Do not copy CPSGT clinical content.
- Do not silently treat broad source mappings as locator-verified authority.
- Do not treat proprietary figures or questions as reusable production assets.
- Math Coach remains a Learning Tool / Math Learning Center, not a Skills Lab simulation.
- Visual provenance belongs in data, not in the image file itself.
