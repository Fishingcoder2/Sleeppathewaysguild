# RPSGT Rebuild Architecture and Migration Checklist

**Document status:** Version 0.1  
**Legacy protection rule:** `RPSGTv2.2026-core.html` remains unchanged and available until the replacement passes full acceptance testing.

## 1. Target structure

```text
/rpsgt-next/
  index.html

  /assets/
    /branding/
    /images/
    /icons/

  /css/
    base.css
    components.css
    mobile.css
    print.css
    accessibility.css

  /js/
    app.js
    router.js
    storage.js
    progress.js
    scoring.js
    reports.js
    search.js
    accessibility.js
    source-status.js

  /data/
    blueprint.json
    tasks.json
    lessons.json
    questions.json
    references.json
    readings.json
    books.json
    glossary.json
    disclosures.json

  /modules/
    dashboard/
    study-trail/
    practice/
    mock-exam/
    reports/
    math-coach/
    scoring-lab/
    ekg-lab/
    frequency-lab/
    hookup-lab/
    reference-library/
    notes/
    settings/

  /legal/
    terms.html
    privacy.html
    affiliate-disclosure.html
    copyright.html
    accessibility.html
```

## 2. Architectural principles

- One screen, one learning task, one obvious next action.
- Mobile-first layout with deliberate desktop expansion.
- One shared question engine for practice, review, and mock exams.
- One shared reporting engine.
- One source-of-truth record for every question, lesson, source, and reading locator.
- Content data must not be embedded directly into the primary HTML shell.
- Every educational record must be versioned and date-controlled.
- No module may depend on undocumented global variables.
- Every external service must be documented in the privacy and security inventory.

## 3. Dashboard requirements

The opening screen should provide:

1. Continue from last visit
2. Study by BRPT blueprint
3. Practice questions
4. Take a mock exam
5. Open skill labs
6. View reports
7. Search references

Math Coach should appear as a dedicated tool, not the default first learning destination.

## 4. Question eligibility engine

A question is eligible only when:

```text
active = true
AND status = approved
AND reviewStatus = current
AND startDate <= today
AND (endDate is empty OR endDate >= today)
AND blueprintVersion is accepted
AND controlling source is active
```

Questions marked draft, review needed, inactive, superseded, archived, prohibited, or expired must never enter active practice or mock-exam pools.

## 5. Core question schema

```json
{
  "id": "D3-RESP-001",
  "active": true,
  "startDate": "2026-07-23",
  "endDate": null,
  "status": "approved",
  "reviewStatus": "current",
  "domain": "D3",
  "taskId": "exact-current-task-id",
  "knowledgeArea": "Respiratory event scoring",
  "difficulty": "application",
  "questionType": "single-best-answer",
  "stem": "Original question text",
  "options": [
    {"id": "A", "text": "Option A"},
    {"id": "B", "text": "Option B"},
    {"id": "C", "text": "Option C"},
    {"id": "D", "text": "Option D"}
  ],
  "correctOptionId": "B",
  "rationale": "Original educational rationale",
  "distractorRationales": {},
  "authoritySourceId": "AASM-SCORING-CURRENT",
  "primaryReadingIds": [],
  "supplementalReadingIds": [],
  "blueprintVersion": "current-at-review",
  "candidateHandbookVersion": "current-at-review",
  "lastReviewed": "2026-07-23",
  "nextReviewDue": "2027-01-23",
  "supersededBy": null,
  "retirementReason": null,
  "questionOrigin": "Original Sleep Pathways Guild question",
  "containsActualExamContent": false,
  "changeHistory": []
}
```

## 6. Storage and recovery requirements

Before migration, document all current storage keys and data structures.

The replacement must support:

- last visited module;
- lesson progress;
- practice history;
- mock-exam recovery;
- unanswered and flagged questions;
- notes and bookmarks;
- report history;
- local data export when feasible;
- clear data reset controls;
- schema versioning and migration.

Do not promise that locally stored progress is permanent or recoverable unless a tested backup mechanism exists.

## 7. Report center requirements

Consolidate current reports into one report center with:

- overview dashboard;
- BRPT domain performance;
- task-level performance;
- question difficulty performance;
- study trail progress;
- practice history;
- mock-exam history;
- readiness estimate with a clear non-guarantee statement;
- recommended lessons and skill labs;
- official-source review links;
- BRPT suggested primary readings;
- clearly labeled paid affiliate textbook links;
- supplemental reading recommendations.

## 8. Legal and transparency requirements

### Opening notice

The opening experience must state that Sleep Pathways Guild is independent and is not affiliated with, endorsed by, sponsored by, or approved by BRPT, AASM, or AAST.

### Examination integrity

The app must state that:

- questions are original Sleep Pathways Guild materials;
- questions are inspired by publicly available BRPT blueprint and candidate-handbook knowledge areas;
- the app does not contain actual BRPT examination questions;
- users may not submit recalled confidential exam questions;
- use does not guarantee a passing score, eligibility, certification, employment, promotion, or any particular outcome.

### Affiliate notice

Display:

> **As an Amazon Associate I earn from qualifying purchases.**

Paid links must be labeled before the click. Academic-looking citations must not silently redirect to an affiliate destination.

### Copyright and permitted use

The app must state that original lessons, questions, explanations, visuals, reports, software, design, and compilations are copyrighted. Personal noncommercial study is permitted. Unauthorized copying, scraping, republication, resale, systematic extraction, or incorporation into another question bank is prohibited, subject to rights provided by applicable law.

### Current-content notice

The app must state that BRPT, AASM, AAST, publishers, and professional societies may revise standards or examination materials at any time, which may temporarily render portions of the app outdated.

## 9. Migration sequence

### Stage 0 — Protect and document

- [x] Preserve the legacy core.
- [x] Record the legacy SHA.
- [x] Create the foundation inventory.
- [x] Create the BRPT-first source crosswalk specification.
- [x] Create the architecture and migration checklist.
- [ ] Complete line-level legacy feature inventory.
- [ ] Inventory storage keys and recovery behavior.
- [ ] Inventory all current questions and references.

### Stage 1 — New shell

- [ ] Create `/rpsgt-next/`.
- [ ] Build accessible global header and navigation.
- [ ] Build dashboard.
- [ ] Add opening independence and no-guarantee notice.
- [ ] Add Terms, Privacy, Affiliate, Copyright, and Accessibility pages.
- [ ] Add mobile navigation and focus management.

### Stage 2 — Structured authority data

- [ ] Verify current BRPT blueprint.
- [ ] Record exact domains, tasks, and weighting.
- [ ] Verify current Candidate Handbook.
- [ ] Build source catalog.
- [ ] Build reading locator records.
- [ ] Add active dates and review dates.

### Stage 3 — Core learning system

- [ ] Build Study Trail.
- [ ] Build reusable lesson component.
- [ ] Build question engine.
- [ ] Build question eligibility filter.
- [ ] Build practice mode.
- [ ] Build search.

### Stage 4 — Reporting

- [ ] Build progress service.
- [ ] Build report center.
- [ ] Link results to task-level lessons and readings.
- [ ] Add transparent readiness methodology.
- [ ] Add clearly labeled affiliate recommendations.

### Stage 5 — Mock exam

- [ ] Build 175-question assembly logic.
- [ ] Implement current blueprint weighting.
- [ ] Add pretest-style item handling.
- [ ] Add timer, pause, recovery, flagging, and unanswered review.
- [ ] Hide answers during active exam.
- [ ] Build post-exam report.

### Stage 6 — Skill labs

- [ ] Math Coach
- [ ] Scoring Lab
- [ ] EKG Lab
- [ ] Frequency Lab
- [ ] Hookup Lab
- [ ] Other validated legacy labs

### Stage 7 — Migration and acceptance

- [ ] Compare every retained legacy feature.
- [ ] Test phone, tablet, laptop, and desktop layouts.
- [ ] Test keyboard and screen-reader navigation.
- [ ] Test progress and exam recovery.
- [ ] Validate question counts and blueprint weights.
- [ ] Validate legal notices and affiliate labeling.
- [ ] Validate all external links.
- [ ] Conduct content review against current authorities.
- [ ] Provide temporary legacy links for unfinished approved functions.
- [ ] Switch public entry only after sign-off.

## 10. Release gates

A module may be released only after it passes:

1. Functional testing
2. Mobile and desktop testing
3. Accessibility testing
4. Content-authority review
5. Source-link review
6. Version/date eligibility testing
7. Privacy and legal review
8. Regression testing against retained legacy behavior
