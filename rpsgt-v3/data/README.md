# RPSGT v3 canonical data staging

These files are extraction and audit artifacts for the modular rebuild. They do not replace the current embedded data package.

- `blueprint.json` preserves the app's four-domain, twelve-task structure and app-authored study targets.
- `question-bank-manifest.json` records counts, hashes, schema coverage, task distribution, reference-key usage, and known anomalies.
- `practice-slice/` preserves the original 36-question development set used to validate the first practice engine.
- `question-bank/` contains the complete validated 2,887-question extraction split into 12 direct task modules and one separate `D2A/D2C` cross-task module.

## Important boundaries

The task study targets are paraphrased learning targets from the current app, not verbatim BRPT blueprint text. No learner data is stored in these files.

The complete Practice Center now uses `question-bank/manifest.json` and loads only the task modules selected for a session. The original practice slice remains as a preserved regression fixture but is no longer used by the current practice engine.

## Practice pool separation

- Learner practice contains 2,327 records.
- All 560 records marked `qa.manualReviewRecommended` are excluded from learner practice by default.
- Quality review contains exactly those 560 manual-review records.
- Quality-review attempts do not update learner totals, domain or task statistics, missed questions, mastery, readiness, or reports.
- All five `D2A/D2C` records remain in their dedicated cross-task module and are confined to quality review.

## Audit findings carried forward

- The embedded package contains 2,887 questions, while several embedded metadata counters still report 2,885.
- The embedded glossary contains 132 terms, while older metadata reports 89.
- Five questions use the cross-task code `D2A/D2C`; no silent reassignment has been made.
- Fifteen question records form three repeated-prompt groups; IDs and answer records remain distinct.
- The used key `aasm-scoring-technical` does not have a directly matched keyed catalog object in the current source and is retained as unresolved rather than silently renamed.

## Automated validation

The branch workflow reconstructs the complete bank, verifies module hashes and source order, checks all answers and identifiers, tests learner/quality pool separation, checks Practice JavaScript syntax, and confirms that the Practice page satisfies the engine's required selector contract.
