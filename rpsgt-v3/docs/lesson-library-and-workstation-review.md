# Lesson access and PSG workstation improvements

This change exposes 48 existing RPSGT guided-station lessons in a searchable reader. It reuses the station packs' explanations, questions, rationales, recaps, and references rather than creating new clinical rules. The original labs retain their visuals, scored station work, and checkpoint completion requirements.

Each Guided Study task now links to related lessons or the Scoring/Respiratory lab. These are supporting activities, not a claim of full blueprint coverage. In particular, the clinical assessment area still needs a dedicated, comprehensive teaching sequence; the daytime and pediatric lessons cover only parts of that scope.

Lesson review records live under `spg_rpsgt_v3.guidedStudy.lessonReviews`. They record first and latest decision correctness, review time, and attempt count; they do not award badges, mark labs complete, or change ordinary practice scores.

The PSG staging workstation now fits its tracing to the visible viewport, uses a single pinned channel-label column while scrolling, and scales channel rows to keep the montage compact. Frozen review offers an explicit enlarged detail view. Returning to scrolling and resizing preserve elapsed simulation time. The five existing synthetic epochs and their waveform generators are unchanged; this is a repeated single-epoch exercise, not a continuous full-night simulation.

The main site's RPSGTv2 entry is unchanged. Broader V3 work remains: comprehensive lesson coverage beyond the existing station packs, more realistic integrated recordings, and a current clinical/content review. The August lab completion matrix is historical and does not describe the current implemented guided-station packs.

Validation: all 48 lesson records have a source, usable study/decision/recap content, one answer in the options, and a valid lab destination. Renderer tests verify the unchanged default montage, narrow-view timebase, and absence of duplicate labels. Existing stage-frequency, shared visual display, live PSG, home-shell, and guided achievement checks pass. Browser review covers searches, area filtering, no-answer feedback, scored feedback, persisted lesson review, PSG pause/resume and detail zoom, and mobile fitting.
