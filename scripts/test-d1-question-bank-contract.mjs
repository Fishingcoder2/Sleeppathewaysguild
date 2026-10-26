import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const migration=await readFile('migrations/0001_question_bank.sql','utf8');
const worker=await readFile('worker/index.js','utf8');
const wrangler=await readFile('wrangler.jsonc','utf8');

for(const table of ['spg_questions','spg_question_eligibility','spg_question_versions','spg_question_releases','spg_question_sync_runs']){
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS '+table),'Missing D1 table '+table);
}
assert.ok(migration.includes('lms_sync_eligible'),'D2 LMS eligibility field missing');
assert.ok(migration.includes('duplicate_family'),'Duplicate-family field missing');
assert.ok(worker.includes("/api/question-bank/version"),'Version endpoint missing');
assert.ok(worker.includes("/api/questions"),'Question-list endpoint missing');
assert.ok(worker.includes("url.pathname.match(/^\\/api\\/question\\/([^/]+)$/)"),'Question detail endpoint missing');
assert.ok(worker.includes("surface==='lms-d2'"),'LMS D2 read contract missing');
assert.ok(!/\b(?:POST|PUT|PATCH|DELETE)\b/.test(worker.replace("request.method!=='GET'",'')),'Worker must remain read-only');
assert.ok(wrangler.includes('"binding": "DB"'),'D1 binding missing');
assert.ok(wrangler.includes('sleep_pathways_tutor_dev'),'Expected D1 database binding missing');
assert.ok(wrangler.includes('"binding": "ASSETS"'),'Static-assets fallback binding missing');
assert.ok(wrangler.includes('"/api/*"'),'API-only worker-first routing missing');

console.log('D1 question-bank contract passed: read-only API, D1 binding, LMS D2 surface, static asset fallback.');
