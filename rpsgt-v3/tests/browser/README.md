# RPSGT v3 browser regression harness

This Playwright suite is development-only. It prepares repeatable browser checks for PR #35 without replacing the required human desktop/mobile/print regression gate.

## Local setup

From the repository root:

```bash
cd rpsgt-v3
npm install
npm run test:browser:install
npm run test:browser
```

The default configuration starts a local Python static server at `http://127.0.0.1:4173/` and tests the isolated `rpsgt-v3/` application. To test an already served private staging origin, set `RPSGT_V3_BASE_URL` to the full v3 directory URL, including the trailing slash.

```bash
RPSGT_V3_BASE_URL="https://example.invalid/rpsgt-v3/" npm run test:browser
```

Useful modes:

```bash
npm run test:browser:headed
npm run test:browser:ui
```

## What the suite currently covers

- Desktop Chromium at 1440 × 900.
- Tablet Chromium at 834 × 1112.
- Mobile Chromium at 390 × 844.
- All principal routes and all ten native laboratory routes.
- Page, console, local-response, and body-overflow failures.
- Main navigation, refresh, and browser back behavior.
- Legacy-storage preservation and migration-export no-write behavior.
- Practice startup and answer feedback.
- Readiness startup and early completion.
- Mock creation, 175-item navigator, save, reload, and resume.
- Reports and Study Summary rendering.
- JSON and CSV browser downloads.
- A sampled headless Chromium print-media PDF generation check.

## What this suite does not prove

A passing run does not by itself establish the interactive release gate. Human review is still required for visual quality, touch ergonomics, focus visibility, keyboard flow, readable tables, long content, browser print preview, Save as PDF appearance, downloaded-file opening in desktop applications, real-device behavior, and any issue that depends on judgment rather than a machine assertion.

Do not mark PR #35 ready or merge it solely because this suite passes. Keep legacy import disabled and keep private browser exports out of Git.
