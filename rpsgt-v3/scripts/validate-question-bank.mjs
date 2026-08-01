import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const bankDir = join(here, "..", "data", "question-bank");
const sha256 = value => createHash("sha256").update(value).digest("hex");
const readText = path => readFile(path, "utf8");

const manifestText = await readText(join(bankDir, "manifest.json"));
const manifest = JSON.parse(manifestText);
const errors = [];
const warnings = [];
const reconstructed = [];
const exactIds = new Set();
const stringIds = new Set();
const promptGroups = new Map();
let questionCount = 0;

for (const moduleEntry of manifest.modules) {
  const path = join(bankDir, moduleEntry.path);
  const text = await readText(path);
  if (sha256(text) !== moduleEntry.sha256) errors.push(`${moduleEntry.path}: SHA-256 mismatch`);

  const moduleData = JSON.parse(text);
  const questions = moduleData.questions;
  const indices = moduleData.sourceIndices;
  if (!Array.isArray(questions) || !Array.isArray(indices)) {
    errors.push(`${moduleEntry.path}: questions/sourceIndices must be arrays`);
    continue;
  }
  if (questions.length !== moduleEntry.questionCount || indices.length !== questions.length) errors.push(`${moduleEntry.path}: count mismatch`);
  if (moduleData.meta?.taskCode !== moduleEntry.taskCode) errors.push(`${moduleEntry.path}: module task code mismatch`);

  questions.forEach((question, offset) => {
    questionCount += 1;
    const sourceIndex = indices[offset];
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0) errors.push(`${moduleEntry.path}: invalid source index at offset ${offset}`);
    else if (reconstructed[sourceIndex] !== undefined) errors.push(`${moduleEntry.path}: duplicate source index ${sourceIndex}`);
    else reconstructed[sourceIndex] = question;

    if (question.taskCode !== moduleEntry.taskCode) errors.push(`${moduleEntry.path}: ${String(question.id)} has taskCode ${question.taskCode}`);
    if (question.domain !== moduleEntry.domain) errors.push(`${moduleEntry.path}: ${String(question.id)} has domain ${question.domain}`);
    if (!Array.isArray(question.options) || !question.options.includes(question.answer)) errors.push(`${moduleEntry.path}: ${String(question.id)} answer is not in options`);
    if (!Array.isArray(question.referenceKeys) || question.referenceKeys.length === 0) errors.push(`${moduleEntry.path}: ${String(question.id)} has no referenceKeys`);
    if (!Array.isArray(question.studyRecommendationKeys) || question.studyRecommendationKeys.length === 0) errors.push(`${moduleEntry.path}: ${String(question.id)} has no studyRecommendationKeys`);

    const exactId = `${typeof question.id}:${JSON.stringify(question.id)}`;
    const stringId = String(question.id);
    if (exactIds.has(exactId)) errors.push(`Duplicate exact ID: ${exactId}`);
    exactIds.add(exactId);
    if (stringIds.has(stringId)) errors.push(`Duplicate stringified ID: ${stringId}`);
    stringIds.add(stringId);

    const prompt = String(question.prompt || "").trim();
    if (!promptGroups.has(prompt)) promptGroups.set(prompt, []);
    promptGroups.get(prompt).push(question.id);
  });
}

if (questionCount !== manifest.meta.questionCount) errors.push(`Total count ${questionCount} does not match manifest ${manifest.meta.questionCount}`);
if (reconstructed.length !== manifest.meta.questionCount || reconstructed.some(item => item === undefined)) errors.push("Source indices do not reconstruct a complete contiguous question bank");
else {
  const bankHash = sha256(JSON.stringify(reconstructed));
  if (bankHash !== manifest.meta.questionBankCanonicalSha256) errors.push(`Reconstructed question-bank hash mismatch: ${bankHash}`);
}

const repeatedGroups = [...promptGroups.values()].filter(group => group.length > 1);
if (repeatedGroups.length !== manifest.integritySummary.exactRepeatedPromptGroupCount) errors.push("Repeated-prompt group count differs from manifest");
if (exactIds.size !== manifest.integritySummary.uniqueExactIds) errors.push("Unique exact ID count differs from manifest");
if (stringIds.size !== manifest.integritySummary.uniqueStringifiedIds) errors.push("Unique stringified ID count differs from manifest");

if (manifest.crossTaskRecords?.ids?.length) warnings.push(`${manifest.crossTaskRecords.ids.length} cross-task records remain isolated in D2A/D2C`);
if (manifest.integritySummary.exactRepeatedPromptRecordCount) warnings.push(`${manifest.integritySummary.exactRepeatedPromptRecordCount} records belong to repeated-prompt groups`);
if (manifest.knownUnresolvedKeys?.length) warnings.push(`Unresolved resource keys retained: ${manifest.knownUnresolvedKeys.join(", ")}`);

console.log(`Validated ${questionCount} questions across ${manifest.modules.length} modules.`);
console.log(`Unique IDs: ${exactIds.size}; repeated prompt groups: ${repeatedGroups.length}.`);
warnings.forEach(message => console.warn(`WARNING: ${message}`));
if (errors.length) {
  errors.forEach(message => console.error(`ERROR: ${message}`));
  process.exitCode = 1;
} else console.log("Question-bank integrity checks passed.");
