# RPSGT v3 canonical data staging

These files are extraction and audit artifacts for the modular rebuild. They do not replace the current embedded data package.

- `blueprint.json` preserves the app's four-domain, twelve-task structure and app-authored study targets.
- `question-bank-manifest.json` records counts, hashes, schema coverage, task distribution, reference-key usage, and known anomalies without copying question wording beyond duplicate-prompt audit entries.

## Important boundaries

The task study targets are paraphrased learning targets from the current app, not verbatim BRPT blueprint text. The question bank remains in the preserved RPSGT file until extraction tests, content hashing, and regression checks are approved. No learner data is stored in these files.

## Audit findings carried forward

- The embedded package contains 2,887 questions, while several embedded metadata counters still report 2,885.
- The embedded glossary contains 132 terms, while older metadata reports 89.
- Five questions use the cross-task code `D2A/D2C`; these require an explicit v3 mapping decision.
- Fifteen question records form three repeated-prompt groups; IDs and answer records remain distinct.
- The used key `aasm-scoring-technical` does not have a directly matched keyed catalog object in the current source and is retained as unresolved rather than silently renamed.
