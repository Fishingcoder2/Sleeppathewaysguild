# RPSGT mobile practice repair

This deployment keeps the previous full application at `RPSGTv2.2026-app.html` and serves `RPSGTv2.2026.html` through a lightweight same-origin launcher.

The launcher injects `assets/rpsgt-mobile-practice-fix.js` after the existing application scripts have loaded. The repair:

- prevents the Practice Center from rebuilding underneath an open focused-practice modal;
- moves quick-practice tasks into a full-height, touch-friendly modal on phones;
- adds a reliable **Ask Coach Bob** modal using the question's existing coaching content;
- preserves the existing question bank, scoring functions, state, and study content;
- provides a basic-app recovery link if the launcher cannot load the preserved application.

Validation performed:

- JavaScript syntax check with Node.js 22;
- launcher structural checks for the doctype, app-data payload, and closing document;
- repository design keeps the original 11 MB application blob unchanged.

A local Chromium interaction run could not be completed because the container's Chromium process hangs even on a one-line static HTML page. Mobile interaction should therefore be smoke-tested on the deployed preview before merging.
