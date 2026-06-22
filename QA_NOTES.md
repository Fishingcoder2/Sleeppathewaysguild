# RPSGT v15.8 Assimilated Build QA

Date: 2026-06-13

## Route and package

- `RPSGTv2.2026.html` is restored at the repository root.
- The homepage links use the canonical route.
- App data is at `assets/data/app-data.json`.
- Stable flashcards are at `assets/data/flashcards-stable.json`.
- No production deployment was performed.

## Preservation checklist

1. Home loads as a single trailhead room.
2. Math Coach opens by itself.
3. Flashcards open by themselves.
4. Glossary / References open by themselves.
5. Reports opens with Practice Progress, Readiness, Mock Exam, Flagged / Missed, What to Study Next, printable summary, and Admin QA views.
6. Calculator uses named arithmetic operations compatible with a restrictive Cloudflare CSP.
7. Calculator does not use dynamic code evaluation.
8. Flashcards print matched front/back cards with stable card numbers.
9. Rendering uses DOM nodes and text content so source strings do not appear as raw UI.
10. Each navigation action clears the previous room before rendering the next.
11. Mobile navigation, controls, cards, reports, and calculators collapse to one-column layouts.
12. Desktop content uses a bounded 1180 px learning area.
13. Primary actions are labeled with the next learner task.
14. Each room includes one clear next action and concise Coach Bob guidance where useful.

## Rich Study Trail restoration

- Home now restores the four-stage trail overview, milestone state, launch cards, and BRPT blueprint snapshot.
- Guided Trail restores all 12 domain/task study lessons with study targets, learning bullets, Coach Bob cues, and focused-practice launch actions.
- Practice Center restores choice-first routes, task filters, difficulty filters, missed review, flagged review, and hard/tricky drill access.
- Skill Labs restore waveform atlas cases, PAP simulation cases, filter/sensitivity memory coaching, and the filter decision drill.
- Mock Exam Hall restores 25, 50, and 100-question blueprint-weighted readiness checks.
- Math Coach now includes calculator tools plus a formula trail and report-math decision practice.

## Data carried forward

- 2,905 RPSGT question-bank items.
- 2,905 generated front/back flashcards.
- 132 glossary entries.
- 126 public reference entries.
- 12 guided blueprint task lessons.
- 13 waveform interpretation cases.
- 7 PAP simulation cases.
- 5 filter and sensitivity memory lessons plus the technical filter drill bank.
- Existing Sleep Pathways Guild logo and a friendly illustrated Coach Bob avatar.
- Existing Study Trail color, typography, and guided-learning tone.

## Focused checks

- Units and labels use `Ω`, `µV/mm`, `µV`, `60 Hz`, `50/60 Hz`, `SpO2`, `TcCO2 / PtcCO2`, `M1 / M2`, and `C3 / M2`.
- Practice and mock results persist in browser local storage.
- Reports derive domain performance and next-study guidance from learner results.
- Printing uses a temporary same-page print frame and does not call `document.close()`.
