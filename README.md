# Sleep Pathways Guild Website

This repository contains the public Sleep Pathways Guild website and study webapps deployed through Cloudflare Workers.

## Live resources

- Main website: `https://sleeppathwaysguild.com/`
- CPSGT Study Launchpad: `https://sleeppathwaysguild.com/cpsgt-study-app.html`
- RPSGT study webapp: `https://sleeppathwaysguild.com/RPSGTv2.2026.html`
- EKG skills lab: `https://sleeppathwaysguild.com/ekg.2026.html`
- Flashcards: `https://sleeppathwaysguild.com/flashcards.2026.html`

## Important files

- `index.html` — main website homepage
- `cpsgt-study-app.html` — complete standalone CPSGT app
- `RPSGTv2.2026.html` — RPSGT study webapp
- `sitemap.xml` and `robots.txt` — search-engine discovery files
- `wrangler.jsonc` — Cloudflare Worker static-assets configuration

## Deployment

Cloudflare is connected to the `main` branch of this repository. A merged or direct commit to `main` can trigger a production deployment.

The repository name, `Sleeppathewaysguild`, contains a historical spelling error. Do not rename it without first updating the Cloudflare Git connection and deployment configuration.

## Owner-approved question release, October 11, 2026

The CPSGT app already contains all 600 owner-approved CPSGT questions. The RPSGT V2 app now preserves its original 2,920 records and adds 315 missing approved questions plus five distinct approved revisions, for 3,240 records. The other 29 approved RPSGT questions already match existing records. Legacy `RPSGTv2.2026-app.html` and `RPSGTv2.2026-core.html` entry points forward to the canonical V2 app with their query and fragment intact.

`data/owner-approved-question-release.json` records all 949 approved question mappings and the 320 additive RPSGT records. Original source review statuses and four unresolved verification holds are retained separately from the owner's release approval. This release does not claim additional independent clinical verification. Existing question IDs, original content and browser-storage keys remain unchanged.

The V3 development app uses the same additive release through its runtime loader while preserving the original extracted task modules and their audit hashes. V3 remains development-only with its existing release gates and `noindex,nofollow` status.

## CPSGT maintenance note

The CPSGT app is now a single standalone HTML file. It does not require `.cpsgt-upload`, `cpsgt-assets`, compressed package fragments, or a browser-side loader. Do not restore those obsolete folders unless the deployment architecture is intentionally changed.

Before replacing a live app file:

1. Keep the existing filename and public URL.
2. Test the file locally in a modern browser.
3. Confirm navigation, reports, local progress storage, and mobile layout.
4. Commit through a branch and review the changed-file list before merging.
5. Verify the Cloudflare deployment and the public URL after merging.

## Contact

Sleep Pathways Guild: `admin@sleeppathwaysguild.com`

Official project contact verified August 3, 2026. Do not use `admin@sleeppathsguild.com` in public pages, applications, documentation, or social profiles.

This is an independent educational project and is not an official BRPT or AASM product.
