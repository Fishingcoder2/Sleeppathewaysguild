# First lesson tutoring preview

The student view teaches Domain 1, Task A before offering the existing three-question Guild practice slice. It introduces patient assessment, anatomy and medication clues, and the recording vocabulary those questions need. Coach Bob, worked examples, source connections and a reading plan precede practice. Later tasks retain their existing checklists.

The lesson step and reading confirmation are versioned separately from the old reviewed-target flag. Practice requires an explicit start. A failed attempt offers topic-specific review and requires a new confirmation before retrying. Passing all three questions meets the Guild's 85% learning target; fictional tutor review still controls the next task. This is not an official BRPT passing score.

Read aloud uses browser speech synthesis and reads only the current lesson narrative. It supports restart, stop, pause/resume where supported, and speed selection for the next playback. Navigation cancels playback. Text remains available when speech fails or is unavailable. Real voices and pause behavior vary by browser and operating system.

## Local verification

From the repository root:

```sh
node --check tutoring-demo/demo.js
node --check tutoring-demo/first-lesson.js
node --check tutoring-demo/read-aloud.js
node --test tutoring-demo/tests/*.test.cjs
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/tutoring-demo/`. The server must serve the repository root so the existing `/rpsgt-v3/data/` and Coach Bob image URLs resolve.

The Node suites use actual lesson scripts and existing practice data with small DOM/speech test doubles. They verify progression, persisted/legacy progress, missing data, answer preservation, remediation, tutor gates, later-task and domain behavior, and speech lifecycle/error handling. They do not replace browser or assistive-technology testing.

Manual checks completed October 11, 2026 in the Codex Chromium-based browser:

- Five-step teaching, explicit practice start, failed answer review and successful retry.
- Selected answers preserved across student/tutor view changes.
- Keyboard Tab, Space and Enter; focus moves to new lesson, practice and result headings.
- Sample tutor sign-off unlocks the next task; passing alone does not.
- Read-aloud start, Pause, Resume, Stop and selected speed; navigation cancels speech.
- Desktop, tablet (768px), and phone widths (390px and 320px); no horizontal overflow in the tested lesson/practice views.

Safari, Firefox, physical phone speech services, and a full screen-reader audit remain unverified.

## Educational review and deployment

Sources are linked beside explanations and in the lesson reference list. Exact textbook chapters depend on the learner's authorized edition and require tutor confirmation. The current licensed AASM manual was not available for direct review. The existing Wake question omits details needed for formal scoring, so the lesson labels it as an introductory example and directs formal scoring to current adult Stage W criteria. A historical public AASM update is labeled as historical.

This remains a public demonstration using fictional learner/tutor data and browser-local progress. Starting first-lesson practice can initialize the fictional Alex Morgan/Jordan Lee workflow; it does not enroll anyone, sign a real agreement, or contact a service. Role switches, sign-offs, billing and time entries remain simulations. No private registry, real records, payment processing or authentication has been added.

Review through the feature branch and draft pull request. The repository's main branch is connected to Cloudflare production deployment. Do not merge, push to main, or run a deployment without owner approval. The checks above run locally; this pull request does not add a GitHub Actions workflow because the current OAuth connection lacks the workflow scope.
