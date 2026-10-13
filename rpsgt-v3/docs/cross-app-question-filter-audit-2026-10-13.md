# Cross-webapp question categorization and filtering audit — 2026-10-13

## Scope
- RPSGT V3 modular question bank, Practice, Guided Trail, Review, Readiness, Mock and flashcards.
- RPSGT V2 legacy single-file application (`RPSGTv2.2026.html`).
- CPSGT single-file application (`cpsgt-study-app.html`).

## Confirmed repository observations
1. RPSGT V3 `core/practice-subjects.js` uses regex patterns over question ID, topic, prompt, question type and report category to infer subject. This is heuristic, not an authoritative human-reviewed primary subject assignment. Some regex patterns overlap (e.g. respiratory/PAP, sleep staging/report calculations, ECG/patient care). Multi-category membership can be legitimate; inferred *primary* category requires verification.
2. RPSGT V3 `core/practice-difficulty.js` maps Easy/Beginner/Foundation/Core to Easy, Intermediate to Intermediate, Hard/Advanced/Tricky to Hard, and Exam to separate Exam-tagged. These are original author tags, not validated BRPT psychometric difficulty ratings.
3. RPSGT V3 `scripts/test-practice-difficulty-filter.mjs` guards 3,240 effective records and 2,680 eligible records (560 QA-held), checks every eligible difficulty maps to exactly one filter group, and asserts that the literal Hard tag appears on only three records. The combined Hard/Advanced/Tricky pool was 137 in the previously successful full-bank audit.
4. RPSGT V3 `scripts/test-practice-subject-filter.mjs` includes ECG inclusion/exclusion regression fixtures; these are useful but cannot prove all subject assignments are semantically correct.
5. RPSGT V3 Guided Trail uses task-aware selection plus `core/guided-question-diversity.js` to reduce near-duplicate prompts in a checkpoint. Lexical similarity does not substitute for semantic or clinical item review.
6. RPSGT V2 and CPSGT are large independent HTML bundles; V3 test success does not validate their separate question banks or filtering logic.

## Required exhaustive audit (NOT YET COMPLETED)
- Inventory every effective learner-eligible and QA-held question in each app; preserve source ID, original text, key, blueprint task/domain, source topic, difficulty, source/references and release status.
- Produce per-app and per-task matrices of question counts, selected filter counts, subject-category overlap, orphaned labels, zero-result combinations, duplicate IDs, repeated stems, held-item leaks, and unmatched task codes.
- Test domain → task → subject → difficulty intersections, including reset/All semantics and learner-visible counts, on desktop and mobile.
- Review semantic category false positives/false negatives and primary-versus-secondary topic assignments; do not silently rewrite answers or move clinical content between blueprint tasks.
- Validate CPSGT and RPSGT against their **distinct current BRPT exam blueprints** and candidate handbooks, not against each other.
- Audit Guided Trail, Practice, Review, Readiness, Mock and flashcards separately, including legacy V2 and CPSGT.
- Create human-readable discrepancy report listing exact question IDs, existing category, recommended category, reason and confidence, plus separate safe code fixes.
- Preserve progress/storage IDs, historical reports, QA holds, and mock blueprint weighting. Do not activate proposed questions or merge editorial changes without evidence.

## Status
**Audit initiated; not an all-question verification or approval.** Existing tests demonstrate some filter integrity in RPSGT V3, but the complete cross-app category inventory, semantic review, V2/CPSGT audit, and UI intersection matrix remain pending. No learner question records changed.
