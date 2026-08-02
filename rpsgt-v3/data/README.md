# RPSGT v3 canonical data staging

These files are extraction and audit artifacts for the modular rebuild. They do not replace the current embedded data package.

- `blueprint.json` preserves the app's four-domain, twelve-task structure and app-authored study targets.
- `question-bank-manifest.json` records counts, hashes, schema coverage, task distribution, reference-key usage, and known anomalies without copying question wording beyond duplicate-prompt audit entries.
- `question-bank/` contains the complete 2,887-question bank split across 12 direct task modules plus one isolated `D2A/D2C` module.
- `practice-slice/` remains only as the preserved 36-question engine-validation fixture; the active Practice and Review interfaces no longer load it.

## Important boundaries

The task study targets are paraphrased learning targets from the current app, not verbatim BRPT blueprint text. No learner data is stored in these files.

The active Practice Center uses the complete modular bank. Learner Practice excludes every `manualReviewRecommended` record, while Quality Review contains only those records and never updates learner progress.

Missed and Mastered Question Review use the same complete learner-practice bank. Correct missed answers move to mastered; incorrect mastered answers return to missed. Quality-review records are excluded from both learner remediation lists.

## Audit findings carried forward

- The embedded package contains 2,887 questions, while several embedded metadata counters still report 2,885.
- The embedded glossary contains 132 terms, while older metadata reports 89.
- Five questions use the cross-task code `D2A/D2C`; they remain isolated and quality-review only.
- Fifteen question records form three repeated-prompt groups; IDs and answer records remain distinct.
- The used key `aasm-scoring-technical` does not have a directly matched keyed catalog object in the current source and is retained as unresolved rather than silently renamed.

## Automated validation

- Complete source-order reconstruction and module SHA-256 checks.
- 2,887 unique IDs and 2,887 valid answer-in-options records.
- Learner pool: 2,327 records; Quality Review pool: 560 records.
- Practice and review JavaScript syntax checks.
- Practice and review HTML selector-contract checks.
- Missed-to-mastered and mastered-to-missed transition checks.
