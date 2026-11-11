# Sleep Pathways Guild — RPSGT Artifact Recognition visual atlas

Date: 2026-11-11
Status: GitHub `main` source integrated; deployment/browser acceptance still requires confirmation.

## Delivery scope

- Five existing scored cases remain exactly five, each with three questions and the same question IDs. The 15-decision Pack 1 and its 80% first-pass completion threshold, correction/retry behavior, and saved historical progress are retained.
- Five original, eight-channel static PSG-style SVG illustrations are now the *primary* visual for Pack 1.
- Three *unscored* optional pattern-comparison illustrations appear in a study gallery below the Pack 1 description: jaw/face EMG activity, eye blinks in EOG, and a suspected thoracic effort-belt signal loss.
- The original deterministic Canvas renderer remains available only when a scored-case SVG cannot load.
- Each displayed figure states that it is a synthetic teaching strip and not a patient recording. No textbook plate, scoring-manual figure, real patient tracing, or publisher question was reproduced.

## Atlas mapping and evidence

| Case | Image | Pattern checked | Length |
| --- | --- | --- | --- |
| Electrode pop/contact instability | `assets/artifact-atlas/electrode-pop.svg` | Sharp isolated F3-M2 transient; neighboring channels comparatively stable | 12 s |
| ECG contamination | `assets/artifact-atlas/ecg-contamination.svg` | Recurring F3-M2 sharp deflections time-locked to ECG | 12 s |
| Sweat-related slow baseline drift | `assets/artifact-atlas/sweat-drift.svg` | Frontal slow sway well above background, with independent central EEG preserved | 12 s |
| Electrical line-frequency interference | `assets/artifact-atlas/line-noise.svg` | Dense 60-Hz oscillation in C3-M2 while C4-M1 remains stable | 6 s |
| Shared-reference artifact | `assets/artifact-atlas/shared-m2.svg` | Correlated disturbance in F3-M2, C3-M2, E1-M2, E2-M2 with M1-referenced EEG comparatively unaffected | 12 s |
| Jaw/facial EMG activity (study only) | `assets/artifact-atlas/jaw-emg.svg` | Higher-frequency EMG shared with nearby EEG/EOG during a burst | 12 s |
| Eye blink (study only) | `assets/artifact-atlas/eye-blink.svg` | Opposing EOG deflections with smaller frontal contamination | 12 s |
| Thoracic belt signal loss (study only) | `assets/artifact-atlas/thoracic-belt-slip.svg` | Thoracic effort signal drops while nasal flow and abdominal effort continue | 12 s |

These 6–12 second pictures are explicitly labeled as teaching excerpts; the original Pack 1 JSON case duration remains 30 seconds for the legacy deterministic fallback.

Independent synthetic-waveform QA on saved SVG assets: ECG-contaminated F3-M2 correlates with ECG at approximately 0.83 versus approximately -0.006 in unaffected F4-M1; shared M2 waveforms correlate at approximately 0.98 (F3-M2 to C3-M2) and 0.98 (F3-M2 to E1-M2), versus approximately 0.09 with independent F4-M1. These are *synthetic-data construction checks*, not clinical sensitivity/specificity measures.

## Textbook pattern sources (APA 7)

Attarian, H. P., & Morgan, M. Y. (Eds.). (2012). *Atlas of electroencephalography in sleep medicine*. Springer. Chapter 5 (Artifacts), including electrode-pop, electrical, ECG, and sweat examples.

Geyer, J. D., Carney, P. R., & Payne, T. A. (2010). *Atlas of polysomnography* (2nd ed.). Lippincott Williams & Wilkins. Chapter 8 (Artifacts).

Gupta, R., Pandi-Perumal, S. R., & BaHammam, A. S. (2018). *Clinical atlas of polysomnography*. Apple Academic Press. Chapter 12 (Artifacts).

Additional concept review: Linley, L. A. (2017). *Artifact recognition and troubleshooting* [Conference presentation], Focus Fall Super Session. This reference is useful for lead/contact and environmental-artifact troubleshooting, not a current scoring-rule authority.

## Preserved educational boundaries

1. Waveform images intentionally show simplified, synthetic physiology and are not calibrated patient EEG/PSG, seizure identification, sleep-stage scoring, or a validated diagnostic instrument.
2. A current, manufacturer-specific acquisition system determines actual filter, reference, common-mode, and notch behavior. Real-study troubleshooting follows facility policy and equipment instructions.
3. The three additional comparison figures do not award progress and do not enter the fifteen-question score.
4. The core question pack, engine IDs, history storage keys, and completion logic are unchanged.
5. New regression `scripts/test-artifact-atlas-assets.mjs` checks asset existence, uniqueness, eight-channel traces, correct abnormal channel distribution, ECG synchrony, shared-reference timing, no external/copied image embedding, and fallback integrity. Artifact CI now includes these checks and the mobile modal test.

## Release validation still required

Run the Artifact Lab CI checks and guarded V3 production release. After deploy, inspect `lab-artifact.html` on desktop, tablet and phone landscape. Confirm each of five scored images renders, enlarged/scrollable trace labels remain legible, hint/confirmation/correction and next-case controls still work, three unscored examples open independently, optional image failure uses the Canvas fallback, and stored progress survives refresh.

Do not mark manual browser/phone signoff complete until it has been observed.
