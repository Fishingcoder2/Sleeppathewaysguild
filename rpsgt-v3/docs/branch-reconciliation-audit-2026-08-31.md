# RPSGT V3 Branch Reconciliation Audit

Date: 2026-08-31

## Protected snapshots

- `backup/main-pre-v3-reconcile-2026-08-31` -> `d4ca4ca7de0fc40a44d98abc37a65dfb1284961c`
- `backup/rpsgt-v3-modular-pre-reconcile-2026-08-31` -> `061c6a8016328be51ba62088889c1994f69e9934`
- Reconciliation working branch: `reconcile/rpsgt-v3-2026-08-31`, based on the protected main snapshot.

## Branch relationship

The branches diverged after merge-base commit `325bde5f9018fab300153aee988f8f5801cec80c` (`Add RPSGT v3 browser release regression workflow`).

Current GitHub comparison at audit start:

- `build/rpsgt-v3-modular` has 269 commits not on `main`.
- `main` has 885 commits not on `build/rpsgt-v3-modular`.
- This is a true divergence, not a simple behind/ahead condition.

## Key finding

Both histories continued active RPSGT V3 development after the split and changed overlapping files. A wholesale merge is therefore unsafe without subsystem-level reconciliation.

## Foundation status

### Aligned or nearly aligned

- `rpsgt-v3/package.json` is identical on both heads.
- `rpsgt-v3/core/app-shell.js` is not reported as a branch difference and the inspected shell content is aligned.
- The shared V3 runtime architecture remains recognizable on both sides.

### V3 branch-only foundation change identified

`rpsgt-v3/core/storage.js` on `build/rpsgt-v3-modular` contains the protected learner-progress reset added in commit `061c6a8016328be51ba62088889c1994f69e9934`. The main version lacks that additive reset behavior.

The reset preserves Settings, Notes, saved Flashcards, and migration data while clearing learner performance/progress state.

## Major feature families currently stronger / broader on main

Initial comparison shows `main` contains substantial V3 work not present on the modular branch, including:

- Artifact lab and artifact workstation infrastructure
- Expanded EKG guided lab and tracing polish
- Hookup guided lab and AASM supplement infrastructure
- Daytime testing guided lab work
- PAP guided lab work
- Pediatric guided lab work
- Instrumentation guided lab work
- Troubleshooting guided lab work
- Expanded respiratory study trail/timeline/display infrastructure
- Expanded scoring context, event-boundary, multi-epoch, mini-study, and workstation infrastructure
- Question option ordering / rotation infrastructure
- Master data registry/model work
- Expanded Math Coach data and navigation
- Improvement-plan and report-insight engines
- Terminology datasets and authority-map work
- Large set of V3 validation workflows and regression scripts
- Memory Games exposure from the dashboard and Guided Study

This makes `main` the safer provisional reconciliation base.

## Major feature families currently unique or materially different on build/rpsgt-v3-modular

Initial comparison shows the modular branch contains substantial work absent from, or materially different from, main, including:

- Protected learner-progress reset in Settings/storage
- Learning Library catalog and split library data
- Additional flashcard catalog / V2-forward-port structures
- Glossary and glossary-game structures
- Memory safe-library / arcade structures
- Report-reading practicum and answer-key tooling
- Sample PSG and PAP titration report learning tools
- Additional scoring workstation teaching-night prototypes/review tooling
- Additional visual respiratory prototypes and renderer work
- Additional study-source records and question-harvest data
- Later learner-facing/report-reading changes through 2026-08-30

These cannot be discarded.

## Reconciliation rule

Do **not** merge either live branch wholesale.

For each subsystem:

1. Start from the `main` implementation on `reconcile/rpsgt-v3-2026-08-31`.
2. Identify files/features that exist only on the modular branch.
3. For overlapping files, compare behavior and tests rather than choosing by commit date alone.
4. Port only the missing or superior behavior.
5. Preserve learner data compatibility and legacy migration protections.
6. Run the applicable subsystem regression tests after each reconciliation group.
7. Only after the reconciled branch passes the complete V3 validation suite should it replace the current canonical development path.

## Planned subsystem order

1. Storage / Settings / migration safety
2. App shell / learner navigation
3. Question bank / rotation / practice / readiness / mock
4. Guided Study / completion / achievements
5. Flashcards / glossary / memory tools
6. Math Coach
7. Skills Labs: hookup, instrumentation, EKG, respiratory, PAP, pediatric, daytime testing, troubleshooting
8. Scoring workstation / visual labs
9. Reports / improvement plan / report-reading practice
10. References / terminology / source governance
11. Full browser and release validation

## Current safety conclusion

No evidence of destroyed V3 work was found. The material risk is split development history and overlapping independent changes. Both source heads are now permanently snapshotted before reconciliation work begins.
