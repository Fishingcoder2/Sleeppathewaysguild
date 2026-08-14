import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const [html,script,engine,storage,practice,questionActions]=await Promise.all([
  readFile(join(root,"readiness.html"),"utf8"),
  readFile(join(root,"core","readiness.js"),"utf8"),
  readFile(join(root,"core","readiness-engine.js"),"utf8"),
  readFile(join(root,"core","storage.js"),"utf8"),
  readFile(join(root,"practice.html"),"utf8"),
  readFile(join(root,"core","practice-question-actions.js"),"utf8")
]);
const selectors=["readiness-load","readiness-home","readiness-shell","readiness-results","question-panel","question-number","question-task","question-difficulty","question-prompt","question-choices","answer-feedback","answer-feedback-summary","answer-feedback-body","previous-question","next-question","flag-question","make-flashcard","readiness-action-status","quit-readiness","session-answered","session-correct","session-accuracy","session-size","result-score","result-weighted","result-correct","result-answered","domain-results","weak-task-results","new-readiness","readiness-history","readiness-history-count"];
for(const name of selectors) assert.ok(html.includes(`data-${name}`),`readiness.html missing data-${name}`);
for(const size of [25,50,100]) assert.ok(html.includes(`data-start-readiness="${size}"`),`missing ${size}-question start control`);
for(const module of ["core/flashcard-engine.js","core/flashcard-store.js","core/practice-question-actions.js","core/readiness-engine.js","core/readiness.js"]) assert.ok(html.includes(module),`readiness scripts missing ${module}`);
assert.ok(!html.includes("data-submit-answer"),"Readiness must not expose a separate Check answer control.");
assert.ok(!html.includes(">Check answer<"),"Readiness learner UI still shows Check answer.");
assert.ok(html.includes("Next checks your selected answer first"),"Readiness does not explain the Next-to-check navigation.");
assert.ok(script.includes("function nextQuestion()")&&script.includes("if(!state.answered)")&&script.includes("submitAnswer();"),"Next question must check the current answer before advancing.");
assert.ok(script.includes("function previousQuestion()")&&script.includes("state.active.index-=1"),"Previous question navigation is missing.");
assert.ok(script.includes("questionActions.toggleReview")&&script.includes('"flaggedIds"'),"Readiness flag action is not wired to the saved flagged queue.");
assert.ok(script.includes("questionActions.saveFlashcard")&&script.includes("RPSGT Flashcard Center"),"Readiness Make flashcard action is not wired.");
assert.ok(script.includes("feedback.open=false")&&html.includes("<details class=\"answer-feedback hidden\""),"Readiness answer reasoning must be optional/collapsible by default.");
assert.ok(!script.includes("Mapped source keys")&&!script.includes("Mapped study keys")&&!html.includes("mapped reference"),"Readiness must not expose internal mapping terminology.");
assert.ok(script.includes("Related reference materials"),"Readiness related-reference learner wording is missing.");
assert.ok(script.includes("readinessRecord(saved)"),"readiness storage path missing");
assert.ok(!script.includes("saved.progress.answered")&&!script.includes("saved.review.missedIds")&&!script.includes("saved.mock"),"readiness must not write ordinary practice progress, missed/mastery, or mock records");
assert.ok(storage.includes("SCHEMA_VERSION=2")&&storage.includes("readiness:{history:[],activeSession:null}"),"storage schema lacks separate readiness record");
assert.ok(practice.includes('href="readiness.html"'),"Practice Center lacks readiness entry point");
assert.ok(engine.includes("allocateCounts")&&engine.includes("difficultyWeight")&&engine.includes("buildSession"),"readiness engine contract missing");
assert.ok(questionActions.includes("toggleReview")&&questionActions.includes("saveFlashcard"),"shared question-action helpers are unavailable");
new Function(script);
console.log("Readiness single-Next answer check, Previous navigation, flag/flashcard tools, optional reasoning panel, storage separation, and selector checks passed.");