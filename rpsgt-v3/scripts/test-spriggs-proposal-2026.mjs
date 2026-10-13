#!/usr/bin/env node
// Draft content gate: only a full owner-reviewed release may enter learner pools.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const path=fileURLToPath(new URL('../data/question-proposals/spriggs-modernized-2026-10-12.json',import.meta.url));
const packageData=JSON.parse(fs.readFileSync(path,'utf8'));
const validTasks=new Set(['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C']);
if(!packageData.status.includes('NOT RELEASED') && !packageData.status.includes('NOT IN LEARNER'))throw Error('Proposal lacks explicit non-release status.');
if(packageData.questionCount!==packageData.questions.length)throw Error('Question count mismatch.');
const ids=new Set(),prompts=new Set();
for(const q of packageData.questions){
 if(ids.has(q.id))throw Error('Duplicate candidate id: '+q.id);
 ids.add(q.id);
 if(!validTasks.has(q.taskCode)||q.domain!==q.taskCode.slice(0,2))throw Error('Invalid task: '+q.id);
 if(!Array.isArray(q.options)||q.options.length!==4||new Set(q.options).size!==4)throw Error('Must have four distinct choices: '+q.id);
 if(q.options.filter(x=>x===q.answer).length!==1)throw Error('Answer not uniquely in options: '+q.id);
 if(!q.rationale||!q.sourceCredit?.spriggs2015Chapter||!q.sourceCredit?.authority?.length)throw Error('Missing evidence context: '+q.id);
 if(!q.qa?.manualReviewRecommended||q.publicationStatus!=='proposed-not-learner-eligible')throw Error('Premature release risk: '+q.id);
 if(!Array.isArray(q.referenceKeys)||q.referenceKeys.length<2)throw Error('Insufficient references: '+q.id);
 const normalized=q.prompt.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 if(prompts.has(normalized))throw Error('Exact duplicate candidate prompt: '+q.id);
 prompts.add(normalized);
}
console.log('Validated '+packageData.questionCount+' unreleased, original Spriggs topic-based candidates. Full clinical and semantic review still required.');
