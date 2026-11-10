# RPSGT V3 — safe Cloudflare Worker + React Case Review release

## Current architecture (November 2026)

The live Worker is `rpsgt-v3-learning-center` on the **existing** custom domain
`webapp.sleeppathwaysguild.com`. Its static assets are served from the full
`rpsgt-v3/` directory: `practice.html`, `review.html`, `study.html`,
`data/`, `core/`, and the other current routes must stay intact.

The new React app is a **sub-application** built from `rpsgt-v3/ui-next/`
into `rpsgt-v3/case-review/`. Do not change the Worker asset directory to
`./dist` until the *entire* V3 site has migrated and all legacy pages/assets
have been explicitly included in the build. The default `rpsgt-v3/wrangler.jsonc` is intentionally **asset-only**.
The experimental Worker router is in the separate, explicitly selected
`rpsgt-v3/wrangler.case-review-release.jsonc`. No `wrangler.toml` is needed.

Cloudflare already routes the custom domain to this Worker. Do **not** add a
second `webapp.sleeppathwaysguild.com/*` route on top of that Custom Domain:
Routes and Custom Domains are different routing modes and a new route can
change live traffic precedence.

## Scoped routing

- `/practice.html`, `/review.html`, `/data/**`, and existing static files
  continue to come directly from the same asset collection.
- Cloudflare's default HTML handling canonicalizes `/practice.html` to `/practice`.
  There is **no Worker redirect** from `/practice` back to `/practice.html`,
  because that pair of redirects caused the November 10 outage.
- `/notebook` redirects to `/case-review/`.
- React case URLs use `/case-review/case/<case-id>` and survive refresh.
  The older `/case-review/?case=<case-id>` link is still understood by React.
- An unmatched, extensionless *HTML navigation* inside `/case-review/` gets
  `/case-review/` (200).
- Missing `.js`, `.css`, `.json`, font, image, and other files stay genuine
  404s. Unknown legacy URLs are also 404s. The Worker never changes the
  learner's storage or question bank.
- The Vite `base` is `/case-review/`, so JS/CSS imports still resolve on
  nested pages even after a hard refresh.

The Worker implementation is `rpsgt-v3/workers/router.js` and its pure Node
regression checks live in `rpsgt-v3/scripts/test-spa-router.mjs`.

## Equivalent Wrangler TOML (illustrative — DO NOT add alongside JSONC)

The **release-specific** JSONC is authoritative for the future hybrid Worker.
The equivalent targeted settings would be:

```toml
name = "rpsgt-v3-learning-center"
compatibility_date = "2026-04-13"
main = "workers/router.js"

[assets]
directory = "."
binding = "ASSETS"
run_worker_first = ["/case-review", "/case-review/*", "/notebook", "/notebook/"]
```

Do not enable global `not_found_handling = "single-page-application"` here.
The Cloudflare Custom Domain mapping is already managed for the Worker.

**Only after a full React migration**, a React-only Worker could instead use
`[assets] directory = "./dist"` and `not_found_handling =
"single-page-application"`. That is a different deployment architecture.

## Build & quality gates

From the repository root:

```sh
cd rpsgt-v3/ui-next
npm install --no-audit --no-fund
npm run typecheck
npm run build
cd ../..
node rpsgt-v3/scripts/test-spa-router.mjs
node rpsgt-v3/scripts/test-practice-shell.mjs
node rpsgt-v3/scripts/test-review-system.mjs
```

A successful build creates `rpsgt-v3/case-review/index.html` and
`rpsgt-v3/case-review/assets/**`. The root `.assetsignore` prevents
TypeScript sources, internal test suites, and Worker code from accidentally
being served as static files.

Pull requests automatically run `Validate RPSGT V3 React Case Review`,
including 12 Playwright tests across desktop, tablet, and mobile.
The release must not ship before desktop/tablet/phone browser UX and
clinical content review have also passed. The app remains `noindex,nofollow`
during staged rollout.

## Production gate

`.github/workflows/rpsgt-v3-production-release.yml` runs **only** from a
manual `workflow_dispatch` on `main`, requiring the explicit text
`DEPLOY_RPSGT_V3`. It builds the React app, runs the Worker and legacy
navigation checks, saves the tested build as a CI artifact, and uses that
same build for the final Worker deployment.

**Owner setup required before enabling the release job:**

1. In GitHub: Settings → Environments, create `rpsgt-v3-production`,
   restrict deployment branches to `main`, and add **required reviewers**.
   The environment name alone does not enforce approval.
2. Configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as
   appropriately scoped GitHub secrets for that environment. Never commit
   the credentials.
3. In Cloudflare Worker → Settings → Builds, check whether there is already
   an automatic deploy on every `main` commit. **Do not run two competing
   production publishers.** If this GitHub release job becomes the chosen
   publisher, disable automatic production promotion in Workers Builds
   (or change its deploy command to `npx wrangler versions upload`).
4. Verify the Worker still owns the Custom Domain, and record its previous
   deployed version so it can be restored if checks fail.

Manual Wrangler equivalent **after review**, from `rpsgt-v3/`:

```sh
npx wrangler deploy --config wrangler.case-review-release.jsonc
```

**Do not deploy from `ui-next/` using only `./dist`**, because that would
replace the legacy app's accessible asset collection.

## Post-deploy checks

From a machine that can reach the public site:

```sh
curl -I https://webapp.sleeppathwaysguild.com/
curl -I https://webapp.sleeppathwaysguild.com/practice.html
curl -I https://webapp.sleeppathwaysguild.com/review.html
curl -I https://webapp.sleeppathwaysguild.com/data/math-coach/manifest.json
curl -I -H 'Accept: text/html' https://webapp.sleeppathwaysguild.com/case-review/case/psg-report-intro
curl -I -H 'Accept: text/html' https://webapp.sleeppathwaysguild.com/case-review/case/pap-report-intro
curl -I https://webapp.sleeppathwaysguild.com/case-review/assets/missing-chunk.js
```

Expected: legacy URLs and both case links are 200; missing JS remains 404.
Also test `/notebook` aliases (307) and verify query
strings survive. These temporary redirects avoid permanently binding users to legacy routes during the future React migration. In a browser, navigate to a case, refresh, use Back,
open the command palette, resize the notebook, and inspect the report.
Verify existing learner progress survives.

If an issue is found, stop new promotion and roll the Worker back to the
previous **known-good Worker version** using Cloudflare Worker deployments;
that does not roll back or overwrite browser-local learner records.

## Existing seven-stage curriculum

A seven-stage curriculum has been proposed, but this routing change neither
claims it is complete nor invents React routes for unimplemented stages.
When each stage actually exists, explicitly add its route and regression
coverage rather than widening the fallback to the entire legacy site.

Cloudflare references:
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- https://developers.cloudflare.com/workers/configuration/routing/
- https://developers.cloudflare.com/workers/ci-cd/builds/

## November 10 emergency rollback and routing regression

An experimental version of this Worker (versions 1641–1649) was published while this work remained in a draft PR. Cloudflare canonicalized `/practice.html` to `/practice` (307), and the draft router sent `/practice` back to `/practice.html` (307), producing `ERR_TOO_MANY_REDIRECTS`. The Worker was rolled back to the last pre-router version **1640** (`43e87c1e-177c-44b5-bae0-8168d9da4a63`), restoring the existing Practice Center. The staged router now removes the `/practice` alias and loads the SPA HTML shell from `/case-review/` (canonical) instead of `/case-review/index.html`. Regression checks simulate the Cloudflare canonicalization sequence. **Never publish this draft routing change to production before PR tests, browser QA, and owner approval.** Also identify and stop any external tool redeploying the draft Worker in the meantime.
