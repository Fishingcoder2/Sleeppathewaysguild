import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const requestedSourcePath = resolve(process.argv[2] || join(repoRoot, "RPSGTv2.2026-core.html"));
const outputDir = resolve(process.argv[3] || join(here, "..", "data", "question-bank"));
const extractedAt = process.env.RPSGT_EXTRACTION_DATE || new Date().toISOString().slice(0, 10);
const sha256 = value => createHash("sha256").update(value).digest("hex");
const compact = value => JSON.stringify(value);
const directTaskCodes = ["D1A","D1B","D1C","D2A","D2B","D2C","D3A","D3B","D3C","D4A","D4B","D4C"];
const moduleTaskCodes = [...directTaskCodes, "D2A/D2C"];

const packagePattern = /<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i;

async function htmlFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "rpsgt-v3") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(path);
    }
  }
  await visit(root);
  return files;
}

async function readPackage(path) {
  try {
    const sourceText = await readFile(path, "utf8");
    const match = sourceText.match(packagePattern);
    if (!match) return null;
    const appDataText = match[1];
    const appData = JSON.parse(appDataText);
    const questions = appData?.seed?.questionBank;
    if (!Array.isArray(questions)) return null;
    return { sourcePath: path, sourceText, appDataText, appData, questions };
  } catch {
    return null;
  }
}

let sourcePackage = await readPackage(requestedSourcePath);
if (!sourcePackage) {
  const candidates = [];
  for (const path of await htmlFiles(repoRoot)) {
    const candidate = await readPackage(path);
    if (candidate) candidates.push(candidate);
  }
  candidates.sort((a, b) => b.questions.length - a.questions.length || b.appDataText.length - a.appDataText.length);
  sourcePackage = candidates[0] || null;
}
if (!sourcePackage) throw new Error(`No HTML file containing a valid <script id="app-data"> question package was found under ${repoRoot}`);

const { sourcePath, sourceText, appDataText, appData, questions } = sourcePackage;
console.log(`Selected source package: ${relative(repoRoot, sourcePath)} (${questions.length} questions)`);

const taskCounts = new Map();
questions.forEach(question => taskCounts.set(question.taskCode, (taskCounts.get(question.taskCode) || 0) + 1));
const unexpectedTaskCodes = [...taskCounts.keys()].filter(code => !moduleTaskCodes.includes(code));
if (unexpectedTaskCodes.length) throw new Error(`Unexpected task codes: ${unexpectedTaskCodes.join(", ")}`);

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const modules = [];
for (const taskCode of moduleTaskCodes) {
  const selected = [];
  questions.forEach((question, sourceIndex) => {
    if (question.taskCode === taskCode) selected.push({ sourceIndex, question });
  });
  if (!selected.length) throw new Error(`No questions found for ${taskCode}`);

  const filename = `${taskCode.toLowerCase().replace("/", "-")}.json`;
  const wrapper = {
    meta: {
      name: `RPSGT question module ${taskCode}`,
      version: 1,
      taskCode,
      domain: selected[0].question.domain,
      questionCount: selected.length,
      sourceFile: relative(repoRoot, sourcePath).replaceAll("\\", "/"),
      sourceScriptId: "app-data",
      sourceAppDataSha256: sha256(appDataText),
      recordsPreservedUnchanged: true,
      developmentOnly: true
    },
    sourceIndices: selected.map(item => item.sourceIndex),
    questions: selected.map(item => item.question)
  };
  const content = compact(wrapper);
  await writeFile(join(outputDir, filename), content, "utf8");
  modules.push({
    taskCode,
    domain: wrapper.meta.domain,
    path: filename,
    questionCount: selected.length,
    firstSourceIndex: selected[0].sourceIndex,
    lastSourceIndex: selected.at(-1).sourceIndex,
    sha256: sha256(content),
    questionsSha256: sha256(compact(wrapper.questions))
  });
}

const idTokens = questions.map(question => `${typeof question.id}:${JSON.stringify(question.id)}`);
const stringIds = questions.map(question => String(question.id));
const promptGroups = new Map();
const schemaCounts = new Map();
const referenceCounts = new Map();
const studyCounts = new Map();
let invalidAnswerCount = 0;
let missingReferenceKeysCount = 0;
let missingStudyRecommendationKeysCount = 0;
let manualReviewRecommendedCount = 0;

for (const question of questions) {
  if (!Array.isArray(question.options) || !question.options.includes(question.answer)) invalidAnswerCount += 1;
  if (!Array.isArray(question.referenceKeys) || !question.referenceKeys.length) missingReferenceKeysCount += 1;
  if (!Array.isArray(question.studyRecommendationKeys) || !question.studyRecommendationKeys.length) missingStudyRecommendationKeysCount += 1;
  if (question.qa && question.qa.manualReviewRecommended) manualReviewRecommendedCount += 1;

  const prompt = String(question.prompt || "").trim();
  if (!promptGroups.has(prompt)) promptGroups.set(prompt, []);
  promptGroups.get(prompt).push(question);

  const schema = Object.keys(question).sort();
  const schemaKey = JSON.stringify(schema);
  schemaCounts.set(schemaKey, (schemaCounts.get(schemaKey) || 0) + 1);

  for (const key of question.referenceKeys || []) referenceCounts.set(key, (referenceCounts.get(key) || 0) + 1);
  for (const key of question.studyRecommendationKeys || []) studyCounts.set(key, (studyCounts.get(key) || 0) + 1);
}

const repeatedPromptGroups = [...promptGroups.entries()]
  .filter(([, records]) => records.length > 1)
  .map(([prompt, records]) => ({
    promptSha256: sha256(prompt),
    recordCount: records.length,
    ids: records.map(record => record.id),
    taskCodes: [...new Set(records.map(record => record.taskCode))].sort(),
    recordsOtherwiseIdentical: records.slice(1).every(record => {
      const withoutId = ({ id, ...rest }) => rest;
      return compact(withoutId(record)) === compact(withoutId(records[0]));
    })
  }));

const countObject = map => Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
const crossTaskQuestions = questions.filter(question => question.taskCode === "D2A/D2C");
const manifest = {
  meta: {
    name: "RPSGT v3 full question-bank extraction manifest",
    version: 1,
    extractedAt,
    sourceFile: relative(repoRoot, sourcePath).replaceAll("\\", "/"),
    sourceHtmlSha256: sha256(sourceText),
    sourceScriptId: "app-data",
    sourceAppDataSha256: sha256(appDataText),
    questionBankCanonicalSha256: sha256(compact(questions)),
    questionCount: questions.length,
    moduleCount: modules.length,
    directTaskModuleCount: directTaskCodes.length,
    crossTaskModuleCount: 1,
    developmentOnly: true,
    recordsPreservedUnchanged: true
  },
  sourceMetadataDiscrepancies: {
    questionCount: { reported: appData?.meta?.questionCount ?? null, actual: questions.length },
    glossaryCount: { reported: appData?.meta?.glossaryCount ?? null, actual: Array.isArray(appData.glossary) ? appData.glossary.length : null }
  },
  integritySummary: {
    uniqueExactIds: new Set(idTokens).size,
    uniqueStringifiedIds: new Set(stringIds).size,
    numericIdCount: questions.filter(question => typeof question.id === "number").length,
    stringIdCount: questions.filter(question => typeof question.id === "string").length,
    answerInOptionsCount: questions.length - invalidAnswerCount,
    invalidAnswerCount,
    missingReferenceKeysCount,
    missingStudyRecommendationKeysCount,
    manualReviewRecommendedCount,
    schemaVariantCount: schemaCounts.size,
    exactRepeatedPromptGroupCount: repeatedPromptGroups.length,
    exactRepeatedPromptRecordCount: repeatedPromptGroups.reduce((total, group) => total + group.recordCount, 0),
    crossTaskRecordCount: crossTaskQuestions.length
  },
  modules,
  crossTaskRecords: {
    taskCode: "D2A/D2C",
    ids: crossTaskQuestions.map(question => question.id),
    migrationDecision: "Retained in a dedicated cross-task module. Do not silently assign to D2A or D2C until an explicit content decision is approved."
  },
  repeatedPromptGroups,
  referenceKeyUsage: { distinctCount: referenceCounts.size, counts: countObject(referenceCounts) },
  studyRecommendationKeyUsage: { distinctCount: studyCounts.size, counts: countObject(studyCounts) },
  knownUnresolvedKeys: ["aasm-scoring-technical"],
  schemaVariants: [...schemaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([fields, recordCount]) => ({ recordCount, fields: JSON.parse(fields) }))
};

await writeFile(join(outputDir, "manifest.json"), compact(manifest), "utf8");
console.log(`Extracted ${questions.length} questions into ${modules.length} modules at ${outputDir}`);
