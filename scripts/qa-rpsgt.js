const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html",
  "RPSGTv2.2026.html",
  "assets/css/rpsgt-app.css",
  "assets/js/rpsgt-app.js",
  "assets/data/app-data.json",
  "assets/data/flashcards-stable.json"
];
const forbidden = [
  "uv/Mm",
  "uV/Mm",
  "UV/MM",
  "Î¼V/Mm",
  "Sp02",
  "${esc(",
  "${state.",
  "${flagged",
  "w.document.close()",
  "new Function",
  "eval("
];

let failed = false;
function check(condition, message) {
  console.log((condition ? "PASS " : "FAIL ") + message);
  if (!condition) failed = true;
}

required.forEach((file) => check(fs.existsSync(path.join(root, file)), file + " exists"));

const sourceFiles = [
  "RPSGTv2.2026.html",
  "assets/css/rpsgt-app.css",
  "assets/js/rpsgt-app.js",
  "assets/data/app-data.json",
  "assets/data/flashcards-stable.json"
];
const combined = sourceFiles.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
forbidden.forEach((text) => check(!combined.includes(text), "forbidden pattern absent: " + text));

const appData = JSON.parse(fs.readFileSync(path.join(root, "assets/data/app-data.json"), "utf8"));
const flashcards = JSON.parse(fs.readFileSync(path.join(root, "assets/data/flashcards-stable.json"), "utf8"));
check(appData.seed.questionBank.length >= 2800, "question bank carries forward at least 2,800 items");
check(appData.glossary.length >= 100, "glossary carries forward at least 100 terms");
check(appData.publicRefs.length >= 100, "reference library carries forward at least 100 entries");
check(flashcards.cards.length === appData.seed.questionBank.length, "every question has a stable flashcard");

const html = fs.readFileSync(path.join(root, "RPSGTv2.2026.html"), "utf8");
const js = fs.readFileSync(path.join(root, "assets/js/rpsgt-app.js"), "utf8");
["home", "trail", "practice", "labs", "mock", "math", "flashcards", "library", "reports"].forEach((room) => {
  check(html.includes('data-room="' + room + '"'), room + " navigation is present");
});
["Guided Study Trail", "Sleep Tech Skill Labs", "Waveform Atlas", "PAP Simulation", "Filters & Sensitivity", "Guild Exam Rehearsal"].forEach((feature) => {
  check(js.includes(feature), feature + " is implemented");
});
["Practice Progress Report", "Readiness Report", "Mock Exam Report", "Flagged / Missed Item Report", "What to Study Next", "Admin QA Dashboard"].forEach((report) => {
  check(js.includes(report), report + " is implemented");
});
["Ω", "µV/mm", "µV", "60 Hz", "50/60 Hz", "SpO2", "TcCO2 / PtcCO2", "M1 / M2", "C3 / M2"].forEach((unit) => {
  check(combined.includes(unit), "required unit/label present: " + unit);
});

process.exitCode = failed ? 1 : 0;
