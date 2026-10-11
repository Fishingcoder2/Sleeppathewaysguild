import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { repoRoot, canonicalName, readPackage, importRelease, hash } from './public-question-release-v2.mjs';

const baselineRef = process.env.SPG_RELEASE_BASE_REF || 'bc7da751b2b1807dc48c2a5687fbe9ae2563a7ba';
const originalHtml = execFileSync('git', ['show', baselineRef + ':' + canonicalName], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const html = await readFile(resolve(repoRoot, canonicalName), 'utf8');
const releaseRaw = await readFile(resolve(repoRoot, 'data/owner-approved-question-release.json'), 'utf8');
const release = JSON.parse(releaseRaw);
const approvedMappings = release.approvedMappings.filter(mapping => mapping.program === 'RPSGT');
const before = readPackage(originalHtml);
const after = readPackage(html);
const original = before.data.seed.questionBank;
const current = after.data.seed.questionBank;
assert.equal(original.length, 2920);
assert.equal(release.questions.length, 320);
assert.equal(current.length, 3240);
assert.ok(after.rawQuestions.startsWith(before.rawQuestions.slice(0, -1) + ','), 'Every original serialized question remains byte-for-byte unchanged and in the original order');
assert.deepEqual(current.slice(0, original.length), original);
assert.equal(new Set(current.map(q => String(q.id))).size, current.length);
assert.deepEqual(current.slice(original.length), release.questions);
assert.equal(after.data.seed.meta.questionCount, current.length);
assert.equal(after.data.seed.meta.qualityControl.questionCount, current.length);
assert.deepEqual(after.data.seed.meta.historicalQualityControl, before.data.seed.meta.qualityControl);
assert.equal(after.data.seed.meta.ownerApprovedQuestionRelease.publicOverlaySha256, hash(releaseRaw));
assert.equal(after.data.seed.meta.ownerApprovedQuestionRelease.releaseId, release.releaseId);
assert.equal(after.data.seed.meta.ownerApprovedQuestionRelease.clinicalVerificationAdded, false);
assert.equal(after.data.seed.meta.ownerApprovedQuestionRelease.sourceVerificationHoldCount, 4);
assert.equal(importRelease(html, release, hash(releaseRaw)).html, html, 'Importer is idempotent');

// All app code and storage keys remain unchanged: only the seed bank and its metadata change.
assert.equal(hash(html.replace(after.match[0], '<APP_DATA>').replace(/\r\n/g, '\n')), hash(originalHtml.replace(before.match[0], '<APP_DATA>').replace(/\r\n/g, '\n')), 'App code and markup are unchanged outside the release data, ignoring checkout line endings');
assert.equal((html.match(/const STORE\s*=\s*[^;]+;/) || [])[0], (originalHtml.match(/const STORE\s*=\s*[^;]+;/) || [])[0]);
assert.equal(release.rpsgtMatched.length, 29);
assert.equal(approvedMappings.length, 349);
const byId = new Map(current.map(q => [String(q.id), q]));
assert.equal(new Set(approvedMappings.map(q => q.approvedId)).size, 349);
for (const mapping of approvedMappings) assert.ok(byId.has(mapping.publicId), 'Approved source ID is available through its public mapping: ' + mapping.approvedId);
assert.equal(release.questions.filter(q => q.ownerRelease.publicRevisionOf).length, 5);
assert.equal(release.questions.filter(q => !q.ownerRelease.publicRevisionOf).length, 315);
assert.equal(release.questions.filter(q => q.ownerRelease.sourceHold).length, 4);
for (const q of release.questions.filter(q => q.ownerRelease.sourceHold)) {
  assert.equal(q.ownerRelease.sourceHoldResolved, false);
  assert.equal(q.ownerRelease.clinicalVerificationAdded, false);
}

// Execute the real pool functions in isolation; no browser or learner storage is used.
function functionText(name) {
  const start = html.indexOf('\nfunction ' + name + '(');
  assert.ok(start >= 0, 'Runtime function exists: ' + name);
  let end = html.indexOf('\nfunction ', start + 1);
  if (end < 0) end = html.indexOf('</script>', start);
  return html.slice(start, end);
}
const names = [
  'isVisualPlaceholderQuestion', 'examEligibleQuestions', 'practiceDifficultyMatches',
  'isHardExamStylePracticeQuestion', 'isTrickyBestAnswerPracticeQuestion', 'filteredPool',
  'spgDisplayPromptV1328', 'spgNormalizeQuestionFamilyV1328', 'spgDedupeByQuestionFamilyV1328',
  'spgQuestionDifficultyBlobV1266', 'spgMockDifficultyScoreV1266', 'spgIsSimpleRecallForMockV1266',
  'spgIsMockStyleCandidateV1266', 'spgD4TreatmentBoostV1326', 'spgMockDifficultySortScoreV1326',
  'spgSortMockDifficultyV1266', 'spgMockEligibleQuestionsV1266'
];
const state = { filters: { domain: 'All', task: 'All', topic: 'All', difficulty: 'All', mode: 'All' }, seenIds: [], missedIds: [], flaggedIds: [] };
const context = vm.createContext({ questions: current, state, SPG_EXAM_MODE_V1266: { BRPT: 'BRPT', STUDY: 'STUDY' }, shuffle: pool => [...pool] });
vm.runInContext(names.map(functionText).join('\n'), context);
const practice = vm.runInContext('filteredPool()', context);
const practiceIds = new Set(practice.map(q => String(q.id)));
const excluded = approvedMappings.filter(m => !practiceIds.has(m.publicId));
assert.equal(excluded.length, 0, 'All 349 approved source mappings are eligible for practice: ' + excluded.map(q => q.approvedId).join(', '));
const studyPool = vm.runInContext('spgMockEligibleQuestionsV1266(questions, SPG_EXAM_MODE_V1266.STUDY)', context);
assert.ok(release.questions.every(q => studyPool.some(p => p.id === q.id)), 'All release additions remain eligible for study readiness');
const mockPool = vm.runInContext('spgMockEligibleQuestionsV1266(questions, SPG_EXAM_MODE_V1266.BRPT)', context);
const eligibleMockAdditions = release.questions.filter(q => mockPool.some(p => p.id === q.id));
assert.ok(eligibleMockAdditions.length > 0, 'The unchanged mock difficulty and family filters admit appropriate approved items');
assert.ok(mockPool.every(q => !q.qa?.manualReviewRecommended && q.mockEligible !== false && !q.qa?.mockExclude && !q.mockExclude && !q.stagingOnly), 'Existing source and staging exclusions remain enforced');
state.filters = { ...state.filters, domain: 'D4', task: 'Administer oxygen therapy' };
assert.ok(vm.runInContext('filteredPool()', context).every(q => q.domain === 'D4' && q.task === 'Administer oxygen therapy'), 'Existing domain and task filtering still works');

// Same-origin legacy entry points preserve query/hash and do not call external loaders.
for (const name of ['RPSGTv2.2026-app.html', 'RPSGTv2.2026-core.html']) {
  const redirect = await readFile(resolve(repoRoot, name), 'utf8');
  assert.ok(!redirect.includes('fetch(') && !redirect.includes('raw.githubusercontent.com'));
  const script = redirect.match(/<script>([\s\S]*?)<\/script>/)[1];
  let destination;
  let fallback;
  vm.runInNewContext(script, {
    URL,
    window: { location: { href: 'https://sleeppathwaysguild.com/' + name + '?student=local#practice', search: '?student=local', hash: '#practice', replace: url => destination = url } },
    document: { getElementById: () => ({ set href(value) { fallback = value; } }) }
  });
  assert.equal(destination, 'https://sleeppathwaysguild.com/RPSGTv2.2026.html?student=local#practice');
  assert.equal(fallback, destination);
}

// Parse every inline JavaScript block so additions cannot silently break the standalone file.
let parsedScripts = 0;
for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/type\s*=\s*["']application\/(?:json|ld\+json)["']/.test(match[1]) || !match[2].trim()) continue;
  new vm.Script(match[2], { filename: canonicalName + ':inline-' + ++parsedScripts });
}
console.log(JSON.stringify({ originalQuestionsPreserved: original.length, approvedSourceMappings: approvedMappings.length, additions: release.questions.length, sourceRevisions: 5, coreAdditions: 315, currentQuestions: current.length, practiceEligible: practice.length, approvedMockCandidates: eligibleMockAdditions.length, inlineScriptsParsed: parsedScripts, sourceHoldsRetained: 4, redirectsVerified: 2 }));
