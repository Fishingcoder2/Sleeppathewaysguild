# RPSGT v3 canonical data staging

These files are extraction and audit artifacts for the modular rebuild. They do not replace the current embedded data package.

- `blueprint.json` preserves the app's four-domain, twelve-task structure and app-authored study targets.
- `question-bank-manifest.json` records counts, hashes, schema coverage, task distribution, reference-key usage, and known anomalies without copying question wording beyond duplicate-prompt audit entries.
- `practice-slice/manifest.json` identifies a 36-question development set with three directly mapped questions from each of the 12 task codes.
- `practice-slice/d1.json` through `d4.json` keep the development questions in small domain modules that can be validated and replaced independently.

## Important boundaries

The task study targets are paraphrased learning targets from the current app, not verbatim BRPT blueprint text. The complete question bank remains in the preserved RPSGT file until extraction tests, content hashing, and regression checks are approved. No learner data is stored in these files.

The practice slice preserves the selected source fields without rewriting question wording, options, answers, rationales, task mappings, or reference keys. Records marked `manualReviewRecommended` were excluded from this first connected slice. The slice is for engine and migration testing; it is not a readiness check or mock exam.

## Audit findings carried forward

- The embedded package contains 2,887 questions, while several embedded metadata counters still report 2,885.
- The embedded glossary contains 132 terms, while older metadata reports 89.
- Five questions use the cross-task code `D2A/D2C`; these require an explicit v3 mapping decision.
- Fifteen question records form three repeated-prompt groups; IDs and answer records remain distinct.
- The used key `aasm-scoring-technical` does not have a directly matched keyed catalog object in the current source and is retained as unresolved rather than silently renamed.

## Practice-slice validation

- 36 unique question IDs.
- Three questions from each direct task code.
- Every selected answer appears in its option list.
- Domain and task filtering, answer feedback, session progression, v3 history writing, and missed/mastered handling are connected through `core/practice.js`.
- A headless browser interaction test completed without console or page errors.
