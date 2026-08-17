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
| Sleep Staging and Event Scoring | Five staging epochs + five respiratory event-evidence cases + eight arousal/limb/artifact/boundary cases + seven review stations + D3 checkpoint | `interactive-in-progress` | Single-epoch and event-context Phase 2 is implemented; consecutive-epoch scoring is not | Phase 3 multi-epoch scoring runs with stage/event changes across boundaries |
| Respiratory Signals and Event Recognition | 5-minute pattern views, 2:30 click-the-evidence cases, pattern comparison, 7-case visual challenge, stations, checkpoint | `interactive-rich` | Rich interaction already exists; completion requirements intentionally remain the established seven stations + checkpoint | Preserve current locked completion rule; refine only when clinical/visual QA identifies a concrete gap |
| PAP and Titration | Seven review checkboxes + 10-question checkpoint | `review-shell` | No patient/PSG titration scenario requiring a next action | Scenario sequence: interface/leak/comfort/event response/stage-position/advanced-mode boundary/documentation |
| Instrumentation, Filters, and Signal Pathways | Seven review checkboxes + 10-question checkpoint | `review-shell` | No visible manipulation of filters, sensitivity, polarity, sampling, or signal pathway | Interactive signal-path tracing and before/after waveform controls |
| Pediatric and Infant Sleep | Seven review checkboxes + 10-question checkpoint | `review-shell` | No age-specific setup, gas-exchange, staging, caregiver, or safety scenario | Age/development cases, pediatric setup, CO2/respiratory evidence, caregiver/safety decisions |
| MSLT and MWT Protocols | Seven review checkboxes + 10-question checkpoint | `review-shell` | No protocol timeline, nap/trial timing, latency calculation, or validity task | Interactive MSLT/MWT timeline with timing, latency, SOREMP, deviation, and validity decisions |
| Integrated Troubleshooting | Seven review checkboxes + 10-question checkpoint | `review-shell` | No integrated multi-channel problem to localize and correct | Capstone cases: patient vs sensor vs lead vs equipment vs environment; choose first correction and recheck |
| Mentoring Diagnostic | 24-item diagnostic and mentoring prescription | `assessment-tool` | Not a skills-lab placeholder | Maintain separately from lab parity work |
| Math Coach | Guided/independent/mastery calculation workflow | `interactive-tool` | Not a skills-lab placeholder | Continue targeted formula/content cleanup separately |

## Priority order

1. Sleep Staging and Event Scoring — finish Phase 3 multi-epoch scoring
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

Implemented:
- Reuse the five validated original 30-second W/N1/N2/N3/REM schematic epochs.
- Hide stage identity until the learner answers.
- Record first-attempt accuracy across all five epochs.
- Require at least 80% on this staging skill challenge for new Scoring Lab completions.
- Preserve existing completed Scoring Lab records rather than revoking historical completion.
- Keep the 10-question D3A/D3B/D3C checkpoint and the seven review stations.

### Phase 2 — event evidence and scoring context

Respiratory event-evidence implemented:
- Five shuffled original 2:30 schematic cases: obstructive apnea, central apnea, mixed apnea, obstructive hypopnea, and RERA/flow limitation ending in arousal.
- Learner commits the event classification before the answer is revealed.
- Two waveform-evidence targets must then be located for every case, for ten required evidence clicks total.
- Wrong evidence clicks remain on the same target with a persistent hint.
- “Show me” highlights the target but does not auto-complete it.

Dedicated context decisions implemented:
- Two arousal cases, including NREM qualification and REM chin-EMG context.
- Two limb-movement cases, including a valid series and respiratory-linked exclusion context.
- Two artifact-versus-physiology cases reusing the original Artifact Lab electrode-pop and broad-movement schematics.
- Two transition/boundary cases: arousal immediately before awakening and a respiratory event spanning an epoch boundary.
- Learner commits the scoring decision before feedback, then confirms two supporting clues per case for sixteen required clues total.
- “Show one clue” may reveal one supporting statement but never auto-completes the case.
- New Scoring completions require at least 80% first-decision accuracy plus complete evidence confirmation in both Phase 2 interactive skills.

Phase 2 is considered implemented for its single-event/context scope. It does not claim full-night or multi-epoch scoring parity.

### Frequency calibration lock

The original staging renderer and the newer Scoring-context renderer are calibrated to the same teaching bands:
- Wake posterior alpha: 8–13 Hz, with faster activity mixed in as appropriate.
- N1: low-amplitude mixed-frequency EEG predominantly in the 4–7 Hz theta range.
- N2: low-amplitude mixed-frequency/theta background with spindle activity in the 11–16 Hz range, most commonly 12–14 Hz.
- N3: dominant slow-wave activity in the 0.5–2 Hz range.
- REM: low-amplitude mixed-frequency EEG, with optional 2–6 Hz sawtooth morphology and low chin tone.
- Arousal teaching bursts are rendered as an abrupt faster-frequency shift above the surrounding stage background and are sampled densely enough to avoid aliasing into a falsely slow appearance.

Regression coverage measures the generated signal itself, not only configured constants. QA fails if rendered stage-band power drifts from the intended stage character or if the arousal fast-band contrast collapses.

### Phase 3 — multi-epoch scoring

Still pending:
- Short shuffled runs in which the learner stages consecutive epochs.
- Stage-transition review across adjacent epochs.
- Event placement/counting across consecutive epochs.
- A larger integrated scoring sequence only after the short-run interaction is validated on mobile.

## Locked boundaries preserved

- Do not copy proprietary AASM figures, scoring-manual text, textbook figures, patient strips, or third-party tracings.
- Original Sleep Pathways Guild teaching schematics should preserve recognizable physiology and natural variability.
- Rule-sensitive cases should point learners to current official AASM guidance rather than pretending app-authored summaries replace the manual.
- Respiratory's established completion rule remains unchanged unless separately approved; its timeline and visual challenge remain additional practice.
- Existing learner completion should not be silently revoked when a lab gains a stronger future completion standard.