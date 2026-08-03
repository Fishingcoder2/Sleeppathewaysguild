import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,"..");
const [mockHtml,mockJs,reportsHtml,reportJs,engine]=await Promise.all([
  readFile(join(root,"mock.html"),"utf8"),readFile(join(root,"core","mock.js"),"utf8"),readFile(join(root,"reports.html"),"utf8"),readFile(join(root,"core","mock-result-report.js"),"utf8"),readFile(join(root,"core","mock-drilldown-engine.js"),"utf8")
]);
for(const selector of ["data-result-report-link","data-mock-history"])assert.ok(mockHtml.includes(selector),`Mock page is missing ${selector}.`);
for(const script of ["core/mock-engine.js","core/mock-drilldown-engine.js","core/mock.js"])assert.ok(mockHtml.includes(script),`Mock page is missing ${script}.`);
assert.ok(mockHtml.indexOf("core/mock-drilldown-engine.js")<mockHtml.indexOf("core/mock.js"),"Mock drill-down engine must load before the mock controller.");
for(const token of ["resultVersion:2","compactItemResults","taskBreakdown","itemResults:itemResults","flaggedIds","unansweredIds","reports.html?mock="])assert.ok(mockJs.includes(token),`Mock controller is missing ${token}.`);
assert.ok(mockJs.includes("root.mock.history.length>20"),"Mock history must remain bounded to 20 attempts.");
for(const selector of ["id=\"mock-detail\"","data-mock-drilldown"])assert.ok(reportsHtml.includes(selector),`Reports page is missing ${selector}.`);
for(const script of ["core/mock-drilldown-engine.js","core/mock-result-report.js"])assert.ok(reportsHtml.includes(script),`Reports page is missing ${script}.`);
assert.ok(reportsHtml.indexOf("core/mock-drilldown-engine.js")<reportsHtml.indexOf("core/mock-result-report.js"),"Mock drill-down engine must load before its report controller.");
for(const boundary of ["compact history stores IDs and answer indexes","Older attempts remain visible as aggregate-only history","Read only"])assert.ok(reportsHtml.includes(boundary),`Reports page is missing drill-down boundary text: ${boundary}`);
assert.equal(/RPSGTStorage\.save|localStorage\.(?:setItem|removeItem|clear)/.test(reportJs),false,"Mock drill-down report must remain read only.");
for(const token of ["feedback-index.json","manifest.json","Aggregate-only historical attempt","data-mock-filter","data-mock-load-review","questionRows","replaceState"])assert.ok(reportJs.includes(token),`Mock drill-down report is missing ${token}.`);
assert.ok(engine.includes("selectedIndex")&&engine.includes("prompt")&&engine.includes("correctAnswer"),"Drill-down engine must store answer indexes and reconstruct display text separately.");
console.log("Mock v2 history, completed-result links, read-only Reports drill-down, lazy question reconstruction, and aggregate-only fallback shell contracts passed.");
