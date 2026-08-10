# RPSGT V3 Visual Skills content packs

Development-only content used by `lab-visual.html`.

## Pack 1 files

- `prototype-sleep-staging.json` — five original 30-second schematic studies for W, N1, N2, N3, and REM plus stage-choice and point-click questions.
- `pack1-intervals.json` — app-authored interval-mark supplement. The first exercise asks the learner to mark the generated N2 spindle teaching burst from beginning to end in C3-M2.

The controller merges these files in memory and sends the combined pack through `RPSGTVisualLabEngine.validatePack()` before a session starts.

## Content boundaries

- No patient PSG data are embedded.
- No source waveform, screenshot, textbook figure, scoring-manual figure, or proprietary rule text is embedded.
- Signal shapes and target coordinates are Sleep Pathways Guild app-authored teaching constructions.
- Stage-oriented characteristics are paraphrased from reviewed project source material; current official guidance remains authoritative for real scoring.
- Visual Skills scores are practice evidence only, not AASM ISR, inter-scorer reliability, clinical competency, or credentialing results.

## Interaction types currently supported

- `stage-choice`
- `point-click` — channel + time
- `interval-mark` — channel + start time + end time using mouse, touch, or stylus Pointer Events
- legacy `region-choice` remains supported by the engine

Future respiratory, PLM, arousal, artifact, and PAP packs should use separate small supplement files rather than turning one JSON file into a monolith.
