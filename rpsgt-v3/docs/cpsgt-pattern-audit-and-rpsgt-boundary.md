# CPSGT Pattern Audit and RPSGT Content Boundary

Status: development-only design contract for RPSGT v3

Branch boundary: `build/rpsgt-v3-modular`

Storage boundary: `spg_rpsgt_v3`

## Non-negotiable exam boundary

CPSGT and RPSGT are different credentialing examinations with different candidate expectations, blueprints, task depth, and clinical scope.

The CPSGT app is used only to study reusable learning-experience patterns. No CPSGT question, answer, rationale, formula lesson, task label, clinical example, source recommendation, mastery rule, or exam-specific wording may be copied into RPSGT v3 merely because the interaction works well in the CPSGT app.

RPSGT v3 content must come from the RPSGT blueprint, reviewed RPSGT question records, approved RPSGT source mappings, and clinically reviewed RPSGT lessons. When a reviewed RPSGT source does not support a learner-facing recommendation, the app must omit the recommendation instead of inventing one.

## CPSGT interaction patterns worth preserving

### Flashcard experience

Preserve these interaction ideas only:

- A dedicated flashcard center rather than isolated question popups.
- A polished sticky-note or flip-card presentation.
- A clear front and a structured back.
- Large touch targets and a modal-first mobile experience.
- Persistent top controls for previous, flip, next, flag or unflag, and exit.
- Clear instructions that explain how to flip and navigate.
- Filters that reduce the active deck without exposing internal identifiers.
- Human-readable domain, task, topic, and study-resource labels.
- A visible empty state when no cards match a filter.
- Reduced-motion support.
- Duplicate prevention when a learner creates a card from a question.
- Persistent learner state for flags, mastery, and review-again decisions.

Do not preserve CPSGT-specific clinical fields or copy built-in CPSGT card content.

### Flashcard information architecture for RPSGT v3

Front:

- Clean concept, prompt, or learner-authored cue.

Back:

- Answer.
- Explanation.
- Memory clue.
- Coach Bob note.
- Recommended study resources, only when verified mappings exist.

RPSGT v3 filters:

- Domain.
- Task.
- Topic.
- Missed.
- Flagged.
- Custom cards.

RPSGT v3 controls:

- Flip.
- Previous.
- Next.
- Flag or remove flag.
- Mastered.
- Review again.
- Exit.

### Math Coach experience

Preserve these learning-flow ideas only:

1. Learn the formula.
2. See a fully worked example.
3. Try a guided problem with help.
4. Practice independently.
5. Complete a mastery check.
6. Celebrate newly earned mastery.

Each RPSGT math lesson must provide:

- Plain-language purpose.
- Formula box.
- Defined variables and units.
- Numbered worked steps.
- Guided question.
- Topic-specific Coach Bob hint.
- Error-specific feedback.
- Similar retry problem.
- Independent practice.
- Mastery check.
- Practice again, review skill, and continue choices.

Do not preserve a CPSGT formula set as though it defines RPSGT scope. RPSGT topics must be independently curated and clinically reviewed.

### Awards and celebration

Preserve these presentation ideas:

- A modal or popup ceremony.
- Prominent medal or emblem.
- Award title.
- Completed task or skill.
- Encouraging Coach Bob message.
- Continue and View awards choices.
- Accessible dismissal.
- Reduced-motion support.
- One-time display only when the award is newly earned.

The award system must not replay historical awards on every page load.

### Responsive modal behavior

Preserve these layout ideas:

- Desktop pop-out modal with bounded width and height.
- Full-height or bottom-sheet treatment on smaller screens.
- Sticky navigation or action controls.
- Natural text wrapping and vertical scrolling.
- No line clamps, ellipsis, fixed-height question stems, or hidden overflow.
- Keyboard close support and focus restoration.

## Current RPSGT v3 gaps found during audit

### Guided Study

The current learner interface still exposes or describes internal mapping details. It includes mapped resource keys, exact task-mapping language, cross-task review language, and task codes in the checkpoint presentation. These must be removed from the learner view while remaining available internally for scoring and troubleshooting.

The current Coach Bob hint begins from a repeated generic heading and builds a template from topic and question type. It should instead prefer reviewed `coachBobNote`, `whyTricky`, and rationale content, then fall back to varied topic-aware guidance.

Question eligibility currently checks task match, manual-review status, valid options, and answer membership. It must also reject visibly incomplete stems, including records that literally end in an ellipsis, without reconstructing missing wording.

The current checkpoint has no working learner-state actions for flag, review later, or create flashcard. Those controls must remain hidden until storage and retrieval are implemented.

### Flashcards

There is no complete RPSGT v3 Flashcard Center. The storage schema does not yet define a dedicated RPSGT v3 card collection with mastery and review-again state.

### Math Coach

The current RPSGT Math Coach is a ten-question D3C calculation set. It records score and completion, but it does not yet provide formula lessons, worked examples, guided attempts, error-specific feedback, retry generation, independent-practice staging, or skill-level mastery ceremonies.

## Storage contract

All new learner state must remain under `spg_rpsgt_v3`.

Recommended additions:

- `review.reviewLaterIds`
- `flashcards.cards`
- `flashcards.order`
- `flashcards.filters`
- `awards.seenCeremonyIds`
- `mathCoach.skills`

A stored RPSGT flashcard may contain:

- Stable internal question ID.
- Front.
- Back or answer.
- Explanation.
- Memory clue.
- Coach Bob note.
- Domain.
- Task.
- Topic.
- Human-readable verified resource titles.
- Source context such as Guided Study or Practice.
- Created date.
- Updated date.
- Mastery status.
- Flag state.
- Review-again state.

Internal IDs may be stored but must not be rendered as learner labels.

Legacy browser keys remain read-only. Import remains disabled:

- `canImport:false`
- `migration.importEnabled:false`
- `IMPORT_ENABLED:false`

## Guided Study repair acceptance criteria

A repair is complete only when:

- No selected question stem is visibly or literally truncated.
- A learner sees `Question 1 of 5`, not a raw question ID or mapping label.
- The full stem wraps and scrolls naturally.
- Internal question IDs and source keys remain absent from the learner DOM.
- Recommended resources display normal titles only.
- No resource section appears when verified mappings are unavailable.
- Flag, review-later, and flashcard actions persist in `spg_rpsgt_v3` and can be retrieved elsewhere.
- Explanation is available after scoring.
- Coach Bob varies guidance and uses the actual question topic and reviewed feedback fields.
- A newly earned award opens one ceremony and is then marked seen.
- End-of-checkpoint routing offers missed review, a new five-question set, task practice, continuation, and return to the map.
- The final task in a domain changes continuation to the next domain.

## Build sequence

1. Repair Guided Study eligibility and learner-facing labels.
2. Extend the isolated v3 storage schema for review actions, flashcards, and one-time award ceremonies.
3. Add Guided Study controls only after their retrieval path exists.
4. Build the RPSGT Flashcard Center with curated RPSGT content and learner-created cards.
5. Replace the ten-question-only Math Coach flow with lesson-based RPSGT skill modules.
6. Add browser and engine tests for incomplete-stem exclusion, hidden internal labels, storage isolation, duplicate-card prevention, award replay prevention, and reduced-motion behavior.
7. Conduct a task-by-task semantic content audit before public release.

## Release boundary

This document does not declare RPSGT v3 production-ready. The app remains development-only, isolated from the public RPSGT app and public Worker, and must not be merged to `main` until the clinical, semantic-mapping, accessibility, storage, and browser release checks pass.
