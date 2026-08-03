# Private browser exports

Raw legacy browser exports may contain learner notes, searches, progress history, and other private values. Every file in this directory is ignored by Git except this README and `.gitignore`.

## Safe validation sequence

1. Open `rpsgt-v3/migration-export.html` from the same website origin, browser profile, and device used for the current public RPSGT app.
2. Download the private export after reviewing the privacy warning.
3. Place the JSON file in this directory.
4. Run:

   `node rpsgt-v3/scripts/validate-private-exports.mjs --write-summary`

5. Review `migration-validation-summary.json`. The summary excludes raw stored values and is safe to use for development review after confirming it contains no local file path you do not wish to disclose.

Do not commit, publish, or routinely transmit raw export files. Capturing and validating an export never enables migration and never changes legacy or v3 browser storage.
