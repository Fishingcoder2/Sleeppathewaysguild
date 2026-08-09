# RPSGT Visual Skills Engine — Technical Reference & License Registry

Development-only provenance record for external technical references considered while building the Sleep Pathways Guild RPSGT Visual Skills Engine.

## Rules

- Public availability does not equal permission to copy, redistribute, or commercialize.
- No external source code, waveform, screenshot, figure, dataset, or annotation set enters production without a recorded license and provenance review.
- Architecture and workflow ideas may be studied independently of source-code reuse.
- Clinical teaching answers remain controlled by reviewed Sleep Pathways Guild content and current authoritative guidance; automated tools and legacy datasets are not treated as the teaching authority.
- Real patient or research PSG data must not be redistributed unless the applicable dataset terms explicitly allow it.

## Current reference registry

| Resource | Primary value | License / restriction status | Planned use |
| --- | --- | --- | --- |
| `mleprince/web-edf-viewer` | Browser EDF parsing, filters, montages, Canvas rendering, Rust/WebAssembly worker architecture | MIT license verified in repository | Architecture reference; possible small reusable ideas only with preserved MIT notice and independent review |
| `somnonetz/copla-editor` | Web-based multidimensional biosignal visualization and assessment; Canvas/Dygraphs interaction patterns | MIT license verified in repository | Architecture and interaction reference |
| `stuartfogel/CountingSheepPSG` | Manual sleep staging, keyboard shortcuts, point-event marking, click-drag duration events, PSG workflow | Repository states research-only and prohibits commercial/medical use | Workflow/design reference only; do not copy source code into SPG production |
| `DennisDean/SleepScienceViewer4` | EDF/XML, hypnogram, annotations, navigation, spectral displays, Python/PySide architecture | AGPL-3.0 stated by project | Feature/design reference; do not add as a production dependency without separate license review |
| `Circadiaware/polydodo` | React + Python sleep architecture; local processing and staging pipeline | MIT license verified in repository | Architecture reference; no automatic staging authority |
| `DennisDean/SleepPortalViewerPublic` | EDF + sleep annotation viewing and hypnogram navigation | License must be re-verified before any code reuse | Design reference only |
| EDF / EDF+ specification | Physiological signal/channel/annotation file model | Public specification; implementation code remains separately licensed | Data-model reference |
| PhysioNet / Sleep-EDF | Real EDF recordings useful for parser and long-recording engineering tests | Dataset-specific terms must be checked before redistribution | Development/QA only unless redistribution rights are documented |
| National Sleep Research Resource (NSRR) | Sleep datasets, annotation conventions, research tooling ecosystem | Dataset-specific access and redistribution terms vary | Architecture/data-model research and approved development testing only |
| Luna / Moonlight | Sleep annotations, hypnogram navigation, signal/annotation separation | License must be verified before any source reuse | Annotation and viewer architecture reference |
| MNE-Python | EDF loading, channel types, annotations, filtering, signal QA | License must be verified for the exact version before production reuse | Offline development/content tooling candidate |
| PyEDFlib | EDF/EDF+ read/write utilities | License must be verified for the exact version before production reuse | Offline conversion/validation tooling candidate |
| YASA | Sleep-staging analysis, spindle/slow-wave/REM detection, hypnogram agreement tools | License must be verified for the exact version before production reuse | Offline QA/analysis candidate; never sole answer-key authority |
| NeuroDSP | Synthetic oscillations and burst generation | License must be verified for the exact version before production reuse | Candidate for original EEG teaching-signal generation |
| NeuroKit2 | Synthetic/processed ECG, respiration, EMG and related physiology | License must be verified for the exact version before production reuse | Candidate for original non-EEG teaching-signal generation |
| MDN Canvas / File / Pointer Events / Web Workers / OffscreenCanvas docs | Browser-native rendering, local files, touch/stylus/mouse input, worker architecture | Web platform documentation | Standards reference |
| BIDS specification | Channel/event metadata conventions | Specification terms apply; no production code implied | Metadata-design reference |

## Production provenance record

Every production visual asset or signal pack should eventually carry a machine-readable provenance block containing at least:

- `id`
- `createdBy`
- `generationMethod`
- `sourceType` (`app-authored-schematic`, `synthetic`, `licensed-open-data`, etc.)
- `externalSource`
- `license`
- `redistributionReviewed`
- `clinicalReviewStatus`
- `reviewedAt`
- `notes`

The first Mini PSG prototype uses only deterministic, app-authored schematic signals generated in the browser. It does not embed external PSG recordings, textbook/scoring-manual figures, or copied third-party waveform assets.
