# Repository Cleanup Audit — 2026-07-29

## Removed

The following files belonged to the superseded compressed-loader deployment and are no longer used by the standalone CPSGT app:

- `.cpsgt-upload/part-000.b64`
- `.cpsgt-upload/part-001.b64`
- `cpsgt-assets/part-000.b64`
- `cpsgt-assets/part-001.b64`
- `cpsgt-assets/README.txt`
- `cpsgt-assets/.keep`

## Verified

- `cpsgt-study-app.html` is the standalone live CPSGT app and does not reference either obsolete asset directory.
- `index.html` identifies both CPSGT and RPSGT study apps and includes CPSGT structured data.
- `robots.txt` allows crawling and points to the sitemap.
- `wrangler.jsonc` serves static assets from the repository root and excludes development/configuration files from deployment.
- No occurrence of the obsolete contact address `admin@sleeppathsguild.com` was found in the main repository search.
- `RPSGTv2.2026.html` was not changed during this cleanup.

## Improved

- Added `README.md` with deployment and maintenance guidance.
- Updated sitemap modification dates for the homepage and CPSGT app to 2026-07-29.

## Deferred

Historical merged branches and pull requests remain part of GitHub history. They do not affect the deployed site. Branch deletion should be handled separately only after confirming no branch is still needed for rollback.
