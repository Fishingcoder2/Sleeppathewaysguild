import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const [html,script,engine,storage,practice]=await Promise.all([
  readFile(join(root,"readiness.html"),"utf8"),
  readFile(join(root,"core","readiness.js"),"utf8"),
  readFile(join(root,"core","readiness-engine.js"),"utf8"),
  readFile(join(root,"core","storage.js"),"utf8"),
  readFile(join(root,"practice.html"),"utf8")
]);
const selectors=["readiness-load","readiness-home","readiness-shell","readiness-results","question-panel","question-number","question-task","question-difficulty","question-prompt","question-choices","answer-feedback","submit-answer","next-question","quit-readiness","session-answered","session-correct","session-accuracy","session-size","result-score","result-weighted","result-correct","result-answered","domain-results","weak-task-results","new-readiness","readiness-history","readiness-history-count"];
for(const name of selectors) assert.ok(html.includes(`data-${name}`),`readiness.html missing data-${name}`);
for(const size of [25,50,100]) assert.ok(html.includes(`data-start-readiness="${size}"`),`missing ${size}-question start control`);
assert.ok(html.includes("core/readiness-engine.js")&&html.includes("core/readiness.js"),"readiness scripts missing");
assert.ok(script.includes("readinessRecord(saved)"),"readiness storage path missing");
assert.ok(!script.includes("saved.progress.answered")&&!script.includes("saved.review.missedIds")&&!script.includes("saved.mock"),"readiness must not write ordinary practice, review, or mock records");
assert.ok(storage.includes("SCHEMA_VERSION=2")&&storage.includes("readiness:{history:[],activeSession:null}"),"storage schema lacks separate readiness record");
assert.ok(practice.includes('href="readiness.html"'),"Practice Center lacks readiness entry point");
assert.ok(engine.includes("allocateCounts")&&engine.includes("difficultyWeight")&&engine.includes("buildSession"),"readiness engine contract missing");
console.log("Readiness page, storage-separation, and selector checks passed.");
