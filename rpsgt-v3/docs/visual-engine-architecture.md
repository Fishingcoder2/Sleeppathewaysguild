# RPSGT Visual Skills Engine — Architecture Direction

Development-only design record for the Mini PSG Viewer and future full-night visual scoring system.

## Core decision

The learner interface is browser-native. Canvas renders dense physiological traces. HTML/SVG-style overlay controls handle questions, annotations, measurements, focus states, and accessible interaction. Python may be used offline for signal generation, EDF conversion, validation, and QA, but the ordinary learner page must not require a Python server.

## Continuous-recording principle

A polysomnography study is modeled as a continuous recording with indexed time windows and separate annotations—not as hundreds or thousands of independent image pages.

A long study may contain hundreds to 1000+ 30-second epochs. The browser must never require all epoch graphics to be rendered simultaneously.

Target conceptual model:

```text
recording
  metadata
  channels
  durationSeconds
  epochSeconds: 30
  signalProvider

annotations
  teachingKey[]
  learner[]

navigation
  currentStartSeconds
  currentDurationSeconds
  selectedEpoch
  hypnogramPosition
```

## Provider boundary

The viewer should eventually consume a provider with a window-oriented contract such as:

```text
getMetadata()
getChannels()
getWindow({ startSeconds, durationSeconds, channelIds })
getAnnotations({ startSeconds, durationSeconds, types })
```

The current prototype is an `app-authored-schematic` provider expressed as JSON channel definitions. Future providers may include reviewed synthetic signal chunks or locally opened, permitted EDF/EDF+ data.

The viewer and question engine should not need to know whether the window came from a schematic generator, binary chunk, EDF parser, or other approved source.

## Rendering strategy

### Current prototype

- One 30-second window.
- Ten schematic channels.
- Canvas 2D rendering.
- Deterministic signal generation in the browser.
- Stage-choice and coarse region-choice interactions.
- No patient data.

### Next stage

- Previous/next epoch navigation.
- Optional 60/90/120-second context windows.
- Point annotations.
- Click-drag duration annotations.
- Time and amplitude measurement tools.
- Per-channel visibility and display controls.
- Annotation layers separate from signal data.

### Full-night target

- Hundreds to 1000+ indexed 30-second epochs.
- Only the active window and a small neighboring cache prepared for display.
- Compressed timeline/hypnogram for whole-night navigation.
- Event list navigation.
- Signal chunks or EDF-backed window reads instead of one enormous JSON sample array.
- Web Worker processing for expensive decode/filter/resample work.
- OffscreenCanvas or WebAssembly considered only when measured performance shows a need.

## Example cache model

If the learner is scoring epoch 437, a future implementation may keep a small neighborhood such as epochs 432–442 prepared while only epoch 437 is actively displayed. Moving forward should make 438 immediately available while the worker prepares the next window.

The exact cache size remains a performance decision and must not be hard-coded into question content.

## Signal / annotation separation

Signal data and scoring annotations are separate resources.

```text
signal recording
  physiology only

teaching annotations
  stage
  spindle
  K-complex
  arousal
  respiratory event
  limb movement
  artifact
  etc.

learner annotations
  learner stage
  learner point/duration marks
  learner event classifications
```

This enables learner-versus-teaching-key comparison without rewriting the physiological recording.

## Question model direction

One recording window should support multiple learning tasks:

1. Recognize — choose the stage/event/pattern.
2. Locate — identify the relevant feature.
3. Measure — mark duration, timing, amplitude, or interval.
4. Interpret — explain which correlated signals support the decision.
5. Act — choose the appropriate technologist response when applicable.

Question content should reference a recording/window and expected annotation or classification; it should not embed a screenshot when the underlying signal representation is available.

## Performance rules

- Do not render a full-night study as 800–1000+ Canvas elements.
- Do not duplicate the same signal samples into every question object.
- Do not store every long physiological signal as a giant learner-state JSON object.
- Do not run expensive filtering or decoding repeatedly on the main UI thread once long-recording support is introduced.
- Keep learner progress and annotation evidence compact and separate from source signal data.

## Provenance and clinical boundary

Every production signal pack or imported dataset must satisfy the provenance registry in `docs/visual-engine-reference-registry.md`.

Automated staging/detection tools may assist generation or QA, but they are not the sole authority for learner answer keys. Rule-sensitive teaching content must be independently reviewed against the appropriate current authoritative source before production release.

## Current implementation files

- `lab-visual.html`
- `assets/visual.css`
- `core/visual-lab-engine.js`
- `core/visual-psg-renderer.js`
- `core/lab-visual.js`
- `data/visual/prototype-sleep-staging.json`
- `scripts/test-visual-lab.mjs`

The current prototype intentionally proves the smallest reusable slice. It must remain replaceable by a windowed provider without changing the learner-facing question concepts.
