# EKG laboratory preserve-versus-rebuild assessment

## Decision

Build a native RPSGT v3 EKG Recognition and Response laboratory while leaving the existing public `ekg.2026.html` file unchanged.

## Why preservation alone is insufficient

The preserved EKG page is a standalone public application with its own navigation, analytics, generated SVG rhythm strips, embedded quiz content, and separate `SPG_EKG_LAB_2026` browser-storage record. It does not use the modular v3 shell, the versioned `spg_rpsgt_v3.labs` progress contract, the validated learner-practice bank, deterministic laboratory selection, bounded attempt history, or the v3 reporting boundary.

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

The checkpoint uses only learner-eligible D2B and D3C records from the validated question bank. It does not copy the legacy generated rhythm strips, embedded quiz questions, proprietary scoring rules, textbook figures, or publisher content.

## Safety and authority boundary

The native laboratory is educational review. Current AASM guidance, physician orders, facility cardiac-rhythm and emergency procedures, equipment instructions, medical direction, and supervised competency remain authoritative. A technologist must assess the patient and signal validity rather than treating a displayed pattern as a diagnosis.

## Acceptance gates

- Native page and controller use the shared v3 shell.
- Progress writes only through `RPSGTStorage.save` to `spg_rpsgt_v3.labs`.
- Source question objects remain unchanged.
- Manual-review, invalid, duplicate, ambiguous, and unrelated records are excluded.
- A standard checkpoint includes D2B and D3C and multiple EKG topic families.
- Completion requires every workflow station plus an 80% checkpoint.
- Failed retries never erase completion; duplicate session IDs never double-count; history remains bounded.
- The legacy public file remains unchanged.
- GitHub Actions must pass all laboratory and regression contracts.
- Interactive desktop/mobile browser validation remains a separate release gate.
