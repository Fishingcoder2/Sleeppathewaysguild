# RPSGT V3 React Case Review Workspace

This is a **staged, isolated** React + TypeScript + Tailwind CSS implementation of the four requested UX upgrades and an accessible Missed Review handoff. It does **not** replace the existing static V3 routes or change their question bank, awards, reports, or learner storage.

## Included

- **Global command palette:** Cmd+K/Ctrl+K or search button; search case studies, practice task codes D1A–D4C, and Coach Bob. Arrow-key navigation, Enter selection, Escape dismissal, and focus trapping.
- **Intent-based sidebar:** Dashboard, Practice Center, Case Review Notebook, and Coach Bob are top-level options. Collapse/expand on desktop and overlay navigation on small devices. Sidebar preference is stored under its own UI-only key, not the learner record.
- **Breadcrumbs + sticky return:** Dashboard > Case Review > category > case. Canonical deep links use `/case-review/case/<case-id>` with browser Back/Forward support; `?case=` links remain readable.
- **Split-pane notebook:** Present the *available* static teaching report beside one-click concept checks and a Coach Bob guidance tab. Resizable splitter supports drag and arrow keys; panes stack on tablet/mobile.
- **Missed Review modal:** Reads the existing `spg_rpsgt_v3.review.missedIds` count **without writing anything**, keeps missed questions separate from flagged items, and links to `/review.html?list=missed`. Escape, focus trap, background dismissal, focus return, and empty-list handling are included.

## Paths

- Entry: `src/main.tsx`
- State, routing, command dispatch, nav, modal: `src/App.tsx`
- Case registry and searchable practice routes: `src/data.ts`
- Case and Coach adapter interfaces: `src/model.ts`
- Reusable components: `src/components/*.tsx`
- Styling: `src/styles.css`
- Read-only V3 storage bridge: `src/reviewCount.ts`

## Local setup and CI

From `rpsgt-v3/ui-next`:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

The Vite build writes static assets to `rpsgt-v3/case-review/` with a stable `/case-review/` Vite asset base. The output **must be built and tested before any deployment**; the source directory is not itself a deployable production React app. Production review assets must be served from the existing same-origin V3 site. Existing teaching report links (`/sample-psg-report.html`, `/sample-pap-titration-report.html`) resolve from any nested case URL on the existing V3 site.

The new workspace is intentionally separate from the legacy static JS modules. Do not rename, delete, or change `core/storage.js`, `core/review.js`, the BRPT question bank, or the old public V2 application to use it. A release integration step would build the React page and include the generated `case-review` folder in the Worker asset upload.

## Clinical and coaching boundaries

Only two **fictional**, existing teaching report assets are currently registered. No mock hypnogram, HSAT, actigraphy, histogram, or PAP compliance image is fabricated. Unsupported artifact selectors are disabled.

The bundled concept checks are original example questions **not derived from patient-specific report findings**. They intentionally do **not** write learner progress; after an example case the CTA opens the real Practice Center task. The Coach Bob drawer offers authored, read-only guidance. It does not pretend to be connected to AI. Connect an authenticated, content-reviewed `CoachAdapter` in `App` before enabling free-text chat.

**Do not add patient-identifying information to the static catalog, URLs, command index, or frontend-only persistence.**

## Verification before release

1. Run `npm run build` and inspect TypeScript warnings.
2. Desktop: toggle sidebar, command search, drag/keyboard split resizing, original report iframe and its external-open link.
3. Tablet/phone: verify artifact visible above questions, close/open mobile sidebar, keyboard focus, and long report scrolling.
4. Click a concept-check answer: show rationale immediately; Next should move forward **once**; a completed case goes to the correct Practice task.
5. Open Missed Review with 0, 1, many, or unavailable saved misses. Confirm the actual `review.html?list=missed` route, no additional progress writes, and focus restoration.
6. Validate each new clinical artifact and question against verified sources before adding it to `src/data.ts`.
7. Do not remove V3's existing `noindex,nofollow` before approval.

This branch is a **code prototype**, not a confirmed production deployment.

## Cloudflare release model

The repo's authoritative `rpsgt-v3/wrangler.jsonc` continues to publish **all existing standalone V3 pages** and stays asset-only. The scoped Worker router at `rpsgt-v3/workers/router.js` is enabled **only** by the explicit `wrangler.case-review-release.jsonc` in a reviewed release. The experimental Worker handles `/case-review/*` and `/notebook`, but never rewrites `/practice`.

Build/PR validation is configured in `.github/workflows/rpsgt-v3-case-review-react.yml`. A manual, approval-gated production workflow is staged in `.github/workflows/rpsgt-v3-production-release.yml`; **do not enable production release until the GitHub environment requires reviewers and Cloudflare's existing automatic publisher has been reconciled**.

Full release and rollback checklist: `rpsgt-v3/docs/case-review-cloudflare-release.md`.

**This draft branch is not merged or deployed.**
