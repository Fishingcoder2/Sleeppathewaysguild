import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '..');
export const canonicalName = 'RPSGTv2.2026.html';
export const packagePattern = /<script[^>]+id=["']app-data["'][^>]*>([\s\S]*?)<\/script>/i;
export const hash = value => createHash('sha256').update(value).digest('hex');

// Locate a JSON value without reserializing its unchanged sibling records.
function valueEnd(text, start) {
  const first = text[start];
  if (first === '"') {
    for (let i = start + 1; i < text.length; i++) {
      if (text[i] === '\\') { i++; continue; }
      if (text[i] === '"') return i + 1;
    }
  } else if (first === '{' || first === '[') {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '"') { i = valueEnd(text, i) - 1; continue; }
      if (text[i] === '{' || text[i] === '[') depth++;
      if (text[i] === '}' || text[i] === ']') depth--;
      if (!depth) return i + 1;
    }
  } else {
    let i = start;
    while (i < text.length && !/[,}\]\s]/.test(text[i])) i++;
    return i;
  }
  throw new Error('Unterminated JSON value');
}

function propertyRange(text, objectStart, name) {
  if (text[objectStart] !== '{') throw new Error('Expected a JSON object');
  let i = objectStart + 1;
  while (i < text.length) {
    while (/\s|,/.test(text[i])) i++;
    if (text[i] === '}') break;
    const keyEnd = valueEnd(text, i);
    const key = JSON.parse(text.slice(i, keyEnd));
    i = keyEnd;
    while (/\s/.test(text[i])) i++;
    if (text[i++] !== ':') throw new Error('Missing JSON property colon');
    while (/\s/.test(text[i])) i++;
    const start = i;
    const end = valueEnd(text, start);
    if (key === name) return { start, end };
    i = end;
  }
  throw new Error(`Missing JSON property ${name}`);
}

export function readPackage(html) {
  const match = html.match(packagePattern);
  if (!match) throw new Error('Canonical V2 app-data package missing');
  const raw = match[1];
  const seedRange = propertyRange(raw, raw.indexOf('{'), 'seed');
  const questionRange = propertyRange(raw, seedRange.start, 'questionBank');
  const metaRange = propertyRange(raw, seedRange.start, 'meta');
  const data = JSON.parse(raw);
  return { html, match, raw, data, questionRange, metaRange, rawQuestions: raw.slice(questionRange.start, questionRange.end) };
}

function replaceSeedValue(html, key, newRaw) {
  const pkg = readPackage(html);
  const seedRange = propertyRange(pkg.raw, pkg.raw.indexOf('{'), 'seed');
  const range = propertyRange(pkg.raw, seedRange.start, key);
  const updated = pkg.raw.slice(0, range.start) + newRaw + pkg.raw.slice(range.end);
  return html.slice(0, pkg.match.index) + pkg.match[0].replace(pkg.raw, () => updated) + html.slice(pkg.match.index + pkg.match[0].length);
}

export function importRelease(html, release, releaseFileSha256 = hash(JSON.stringify(release))) {
  if (!Array.isArray(release.questions)) throw new Error('Owner release questions missing');
  const pkg = readPackage(html);
  const original = pkg.data.seed.questionBank;
  const ids = new Map(original.map(q => [String(q.id), q]));
  const additions = [];
  for (const q of release.questions) {
    const id = String(q.id);
    // Importing question text never constitutes owner or clinical approval.
    // Keep unreviewed proposals out of V2 even if their ID already exists in its data.
    if (q.ownerReleaseApproved !== true || q.qa?.manualReviewRecommended === true ||
        q.qa?.learnerExcluded === true || q.publicationStatus === 'proposed-not-learner-eligible') {
      throw new Error(`V2 question is not approved for learner release: ${id}`);
    }
    if (ids.has(id)) {
      if (JSON.stringify(ids.get(id)) !== JSON.stringify(q)) throw new Error(`Release ID collision with different content: ${id}`);
      continue;
    }
    if (!q.prompt || !Array.isArray(q.options) || !q.options.includes(q.answer)) throw new Error(`Invalid approved question: ${id}`);
    additions.push(q);
    ids.set(id, q);
  }
  const all = original.concat(additions);
  const meta = structuredClone(pkg.data.seed.meta);
  if (!meta.historicalQualityControl) meta.historicalQualityControl = structuredClone(meta.qualityControl || {});
  const taskCounts = {};
  const promptCounts = new Map();
  for (const q of all) {
    taskCounts[q.taskCode || 'Unmapped'] = (taskCounts[q.taskCode || 'Unmapped'] || 0) + 1;
    const prompt = String(q.prompt || '').trim();
    promptCounts.set(prompt, (promptCounts.get(prompt) || 0) + 1);
  }
  const taskMap = new Map(pkg.data.seed.blueprintDomains.flatMap(d => d.tasks.map(task => [d.id + '||' + task, true])));
  meta.questionCount = all.length;
  meta.qualityControl = {
    ...meta.qualityControl,
    qaScope: 'Current automated structural counts. Prior source-audit counts are retained in historicalQualityControl. Owner publication approval does not replace clinical source verification.',
    questionCount: all.length,
    taskCounts,
    scoringRuleRelatedCount: all.filter(q => q.qa?.scoringRuleRelated === true).length,
    manualReviewRecommendedCount: all.filter(q => q.qa?.manualReviewRecommended === true).length,
    invalidTaskMappingCount: all.filter(q => !taskMap.has(q.domain + '||' + q.task)).length,
    answerNotInOptionsCount: all.filter(q => !Array.isArray(q.options) || !q.options.includes(q.answer)).length,
    missingReferenceKeysCount: all.filter(q => !Array.isArray(q.referenceKeys) || !q.referenceKeys.length).length,
    exactDuplicatePromptCount: [...promptCounts.values()].reduce((sum, n) => sum + Math.max(0, n - 1), 0)
  };
  meta.ownerApprovedQuestionRelease = {
    releaseId: release.releaseId || release.id || 'spg-owner-approved-2026-10-11',
    approvedAt: release.ownerApprovedAt || release.approvedAt || '2026-10-11',
    approvedBy: 'Tracy Frazier',
    program: 'RPSGT',
    approvedProgramQuestionCount: release.programCounts?.RPSGT || 349,
    questionCount: all.length,
    originalRecordsPreserved: true,
    addedQuestionCount: release.questions.length,
    matchedExistingQuestions: release.rpsgtMatched || [],
    approvedMappings: (release.approvedMappings || []).filter(mapping => mapping.program === 'RPSGT'),
    publicOverlay: 'data/owner-approved-question-release.json',
    publicOverlaySha256: releaseFileSha256,
    originalApprovedSourceSha256: release.approvedSourceSha256,
    sourceVerificationHoldCount: (release.sourceHoldIds || []).length,
    clinicalVerificationAdded: false,
    note: 'Approved source revisions have separate IDs so existing questions and saved learner progress retain their original identity. Source review holds remain in provenance.'
  };
  let updated = html;
  if (additions.length) {
    const rawQuestions = pkg.rawQuestions.slice(0, -1) + (original.length ? ',' : '') + additions.map(q => JSON.stringify(q).replace(/</g, '\\u003c')).join(',') + ']';
    updated = replaceSeedValue(updated, 'questionBank', rawQuestions);
  }
  updated = replaceSeedValue(updated, 'meta', JSON.stringify(meta).replace(/</g, '\\u003c'));
  return { html: updated, added: additions.length, total: all.length };
}

export const legacyRedirect = name => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>RPSGT Study Trail | Sleep Pathways Guild</title>
  <link rel="canonical" href="https://sleeppathwaysguild.com/RPSGTv2.2026.html">
  <meta name="robots" content="noindex,follow">
  <style>body{font-family:Arial,sans-serif;margin:3rem auto;max-width:40rem;padding:0 1rem;color:#172033;line-height:1.6}a{color:#1759a8}</style>
</head>
<body>
  <h1>RPSGT Study Trail</h1>
  <p>Opening the current study app. Your saved progress stays on this website.</p>
  <p><a id="current-app" href="./RPSGTv2.2026.html">Open the RPSGT Study Trail</a></p>
  <script>
    // ${name} remains a supported entry address; the canonical app owns the current bank.
    const currentApp = new URL('./RPSGTv2.2026.html', window.location.href);
    currentApp.search = window.location.search;
    currentApp.hash = window.location.hash;
    document.getElementById('current-app').href = currentApp.href;
    window.location.replace(currentApp.href);
  </script>
</body>
</html>
`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const releasePath = resolve(repoRoot, 'data/owner-approved-question-release.json');
  const releaseRaw = await readFile(releasePath, 'utf8');
  const release = JSON.parse(releaseRaw);
  const appPath = resolve(repoRoot, canonicalName);
  const result = importRelease(await readFile(appPath, 'utf8'), release, hash(releaseRaw));
  await writeFile(appPath, result.html, 'utf8');
  for (const name of ['RPSGTv2.2026-app.html', 'RPSGTv2.2026-core.html']) await writeFile(resolve(repoRoot, name), legacyRedirect(name), 'utf8');
  console.log(`V2 owner release: ${result.added} additions; ${result.total} questions; legacy entry points use the current app.`);
}
