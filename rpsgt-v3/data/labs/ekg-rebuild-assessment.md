# EKG laboratory preserve-versus-rebuild assessment

## Decision

Build a native RPSGT v3 EKG Recognition and Response laboratory while leaving the existing public `ekg.2026.html` file unchanged.

## Why preservation alone is insufficient

The preserved EKG page is a standalone public application with its own navigation, analytics, generated SVG rhythm strips, embedded quiz content, and separate `SPG_EKG_LAB_2026` browser-storage record. It does not use the modular v3 shell, the versioned `spg_rpsgt_v3.labs` progress contract, deterministic laboratory selection, bounded attempt history, or the v3 reporting boundary.

The legacy page remains useful to current public users and as historical design reference, but directly routing the v3 catalog to it would leave EKG as the only laboratory outside the shared progress, testing, accessibility, and content-integrity system.

## Native v3 scope

The replacement teaches a sleep-technologist workflow rather than independent diagnosis:

1. Verify ECG tracing validity and distinguish artifact or lead problems.
2. Determine rate and regularity.
3. Review P waves and atrial activity.
4. Review PR/QRS features and the atrial-ventricular relationship.
5. Classify a broad pattern family and correlate it with the patient, video, and neighboring PSG channels.
6. Assess symptoms and urgency, then follow facility escalation and emergency procedures.
7. Document the finding, patient assessment, intervention, response, notifications, and limitations.

## Checkpoint source decision

The extracted learner bank contains eight eligible EKG records across the mapped tasks: seven D2B and one D3C. That is not enough to construct the required ten-question checkpoint or provide balanced response-and-reporting coverage. The implementation therefore does not shrink the checkpoint, silently broaden the filter to unrelated questions, or misrepresent the bank as balanced.

The checkpoint combines those eight extracted eligible records with seven original Sleep Pathways Guild questions stored in `ekg-checkpoint-supplement.json`:

- Three D2B workflow questions covering cross-channel ECG contamination, loose-electrode artifact, and symptomatic patient response.
- Four D3C workflow questions covering systematic review order, movement-correlated artifact, factual event documentation, and persistent signal limitations.

The combined eligible pool contains 15 records: ten D2B and five D3C. A standard ten-question checkpoint selects five from each task code. The supplement is explicitly marked `appAuthored`, carries original wording, is validated separately from the extracted bank, and cannot load unless its metadata count matches its records.

The supplement does not copy the legacy generated rhythm strips, embedded legacy quiz questions, textbook prose, figures, tables, proprietary scoring rules, or publisher content. CI also checks that none of its exact prompts appears in the preserved legacy page.

## Safety and authority boundary

The native laboratory is educational review. Current AASM guidance, physician orders, facility cardiac-rhythm and emergency procedures, equipment instructions, medical direction, and supervised competency remain authoritative. A technologist must assess the patient and signal validity rather than treating a displayed pattern as a diagnosis.

## Acceptance gates

- Native page and controller use the shared v3 shell.
- Progress writes only through `RPSGTStorage.save` to `spg_rpsgt_v3.labs`.
- Extracted-bank and supplemental source objects remain unchanged.
- Manual-review, invalid, duplicate, ambiguous, and unrelated records are excluded.
- The extracted-bank eligibility count remains visible as eight; any future change requires deliberate supplement reassessment.
- Supplement metadata, IDs, task codes, answer validity, source labels, and originality boundary are validated.
- A standard checkpoint contains five D2B and five D3C questions and multiple EKG workflow families.
- Completion requires every workflow station plus an 80% checkpoint.
- Failed retries never erase completion; duplicate session IDs never double-count; history remains bounded.
- The legacy public file remains unchanged and retains its preservation sentinels.
- GitHub Actions must pass all laboratory and regression contracts.
- Interactive desktop/mobile browser validation remains a separate release gate.
