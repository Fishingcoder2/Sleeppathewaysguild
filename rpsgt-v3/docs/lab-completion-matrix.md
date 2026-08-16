# RPSGT V3 Lab Completion Matrix

Date: 2026-08-16

This document separates **route readiness** from **learner-content completeness**. A lab can have a working V3 route, storage, checkpoint, and completion record while still being only a review shell.

## Completion standard

A learner-facing skills lab should be treated as content-complete for its stated scope only when it has all of the following:

1. A working V3 route with mobile-safe controls.
2. At least one genuine skill interaction in which the learner must inspect, calculate, place, classify, localize, sequence, troubleshoot, or otherwise perform the skill instead of only checking a review box.
3. Immediate, useful feedback that explains the evidence or next action.
4. Durable lab-specific progress evidence saved through versioned RPSGT V3 storage.
5. A validated checkpoint or scored interactive pack appropriate to the lab's scope.
6. Clear clinical, copyright, and scope boundaries.
7. No learner-facing placeholders presented as finished skill content.
8. Regression coverage for the lab's defining interaction and completion rule.

A checklist may support a lab, but **a checklist by itself is not an interactive skill exercise**.

## Content-status vocabulary

- `interactive-foundation` — genuine scored interaction exists and is sufficient for the lab's currently stated limited scope.
- `interactive-rich` — multiple genuine interactive learning modes exist; further refinement may still be planned.
- `interactive-in-progress` — at least one genuine interaction exists, but the lab's advertised scope is broader than the implemented skill practice.
- `review-shell` — V3 route, review stations, storage, and checkpoint exist, but the central skill is not yet practiced interactively.
- `assessment-tool` — assessment/diagnostic utility rather than a skills lab.
- `interactive-tool` — substantial interactive utility that is not being judged by the lab-completion standard.

## Audit matrix

| Lab | Current learner interaction | Current content status | Main gap | Next build target |
|---|---|---|---|---|
| Hookup and Electrode Placement | Six review checkboxes + 10-question checkpoint | `review-shell` | No landmark measurement, placement, impedance, or correction task | Interactive 10–20 landmarks, measurements, electrode placement, impedance troubleshooting |
| EKG Recognition and Response | Seven review checkboxes + checkpoint; current V3 page intentionally omits older generated rhythm strips | `review-shell` | No rhythm-strip recognition/measurement experience in V3 | Original static/teaching rhythm strips, rate/rhythm sequence, signal-validity and response cases |
| Visual Recognition / Mini PSG Viewer | Five 30-second original staging epochs; stage choices; point-to-feature targets; interval marking | `interactive-foundation` | Limited to Pack 1 staging/feature recognition | Additional visual packs after core lab rebuilds |
| Artifact Recognition | Five original PSG-style cases, 15 scored visual decisions, no checklist credit | `interactive-foundation` | Pack breadth can grow, but current scope is genuinely interactive | Additional artifact families only after shell labs are rebuilt |
| Sleep Staging and Event Scoring | Seven review checkboxes + checkpoint on main; staging skill interaction being added in this initiative | `interactive-in-progress` | Event scoring, arousal, respiratory, limb-movement, transition, and multi-epoch practice still incomplete | Reuse validated staging renderer first, then add event-localization and multi-epoch scoring |
| Respiratory Signals and Event Recognition | 5-minute pattern views, 2:30 click-the-evidence cases, pattern comparison, 7-case visual challenge, stations, checkpoint | `interactive-rich` | Rich interaction already exists; completion requirements intentionally remain the established seven stations + checkpoint | Preserve current locked completion rule; refine only when clinical/visual QA identifies a concrete gap |
| PAP and Titration | Seven review checkboxes + 10-question checkpoint | `review-shell` | No patient/PSG titration scenario requiring a next action | Scenario sequence: interface/leak/comfort/event response/stage-position/advanced-mode boundary/documentation |
| Instrumentation, Filters, and Signal Pathways | Seven review checkboxes + 10-question checkpoint | `review-shell` | No visible manipulation of filters, sensitivity, polarity, sampling, or signal pathway | Interactive signal-path tracing and before/after waveform controls |
| Pediatric and Infant Sleep | Seven review checkboxes + 10-question checkpoint | `review-shell` | No age-specific setup, gas-exchange, staging, caregiver, or safety scenario | Age/development cases, pediatric setup, CO2/respiratory evidence, caregiver/safety decisions |
| MSLT and MWT Protocols | Seven review checkboxes + 10-question checkpoint | `review-shell` | No protocol timeline, nap/trial timing, latency calculation, or validity task | Interactive MSLT/MWT timeline with timing, latency, SOREMP, deviation, and validity decisions |
| Integrated Troubleshooting | Seven review checkboxes + 10-question checkpoint | `review-shell` | No integrated multi-channel problem to localize and correct | Capstone cases: patient vs sensor vs lead vs equipment vs environment; choose first correction and recheck |
| Mentoring Diagnostic | 24-item diagnostic and mentoring prescription | `assessment-tool` | Not a skills-lab placeholder | Maintain separately from lab parity work |
| Math Coach | Guided/independent/mastery calculation workflow | `interactive-tool` | Not a skills-lab placeholder | Continue targeted formula/content cleanup separately |

## Priority order

1. Sleep Staging and Event Scoring
2. Hookup and Electrode Placement
3. Instrumentation, Filters, and Signal Pathways
4. PAP and Titration
5. Pediatric and Infant Sleep
6. MSLT and MWT Protocols
7. EKG Recognition and Response
8. Integrated Troubleshooting capstone

Artifact, Visual Skills, and Respiratory should be used as implementation references rather than rebuilt from scratch.

## Scoring Lab phased target

### Phase 1 — stage recognition inside Scoring Lab

- Reuse the five validated original 30-second W/N1/N2/N3/REM schematic epochs.
- Hide stage identity until the learner answers.
- Record first-attempt accuracy across all five epochs.
- Require at least 80% on this staging skill challenge for new Scoring Lab completions.
- Preserve existing completed Scoring Lab records rather than revoking historical completion.
- Keep the 10-question D3A/D3B/D3C checkpoint and the seven review stations.

### Phase 2 — event evidence

Add original schematic interactions for arousal, respiratory-event evidence, limb-movement context, artifact-versus-physiology, and stage-transition decisions.

### Phase 3 — multi-epoch scoring

Add short shuffled runs in which the learner stages consecutive epochs and reviews changes across epoch boundaries before progressing to a larger scoring exercise.

## Locked boundaries preserved

- Do not copy proprietary AASM figures, scoring-manual text, textbook figures, patient strips, or third-party tracings.
- Original Sleep Pathways Guild teaching schematics should preserve recognizable physiology and natural variability.
- Respiratory's established completion rule remains unchanged unless separately approved; its timeline and visual challenge remain additional practice.
- Existing learner completion should not be silently revoked when a lab gains a stronger future completion standard.
