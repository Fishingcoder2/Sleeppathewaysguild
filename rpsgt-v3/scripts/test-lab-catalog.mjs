import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const source=await readFile(join(root,'core','lab-catalog-engine.js'),'utf8');
const catalog=JSON.parse(await readFile(join(root,'data','labs','catalog.json'),'utf8'));
const context={globalThis:{},JSON,Map,Set,Object,Array,Number,String,Boolean,Math};
vm.createContext(context);
vm.runInContext(source,context,{filename:'lab-catalog-engine.js'});
const engine=context.globalThis.RPSGTLabCatalogEngine;

const validation=engine.validateCatalog(catalog);
assert.equal(validation.valid,true);
assert.equal(validation.count,13);
assert.equal(new Set(catalog.labs.map(lab=>lab.id)).size,13);
assert.equal(catalog.meta.individualLabParityComplete,false,'Interactive laboratory completion pass must remain open while checklist-style labs are being rebuilt.');
assert.equal(catalog.meta.interactiveCompletionPass,'in-progress');
assert.equal(catalog.meta.version,13);
assert.equal(engine.VERSION,'1.2.0');
assert.deepEqual(engine.REVIEW_STAGE_IDS.slice().sort(),['daytime-testing','ekg','instrumentation','pap','pediatric','respiratory','scoring','troubleshooting']);

const linked=catalog.labs.filter(lab=>lab.status==='legacy-linked');
assert.equal(linked.length,0,'No v3 catalog route should depend on a legacy laboratory page.');
const ready=catalog.labs.filter(lab=>lab.status==='v3-ready');
assert.deepEqual(ready.map(lab=>lab.id).sort(),['artifact','daytime-testing','ekg','hookup','instrumentation','math-coach','mentoring-diagnostic','pap','pediatric','respiratory','scoring','troubleshooting','visual']);
assert.equal(ready.length,13);
for(const [id,route] of Object.entries({hookup:'lab-hookup.html',ekg:'lab-ekg.html',visual:'lab-visual.html',artifact:'lab-artifact.html',scoring:'lab-scoring.html',respiratory:'lab-respiratory.html',instrumentation:'lab-instrumentation.html',pap:'lab-pap.html',pediatric:'lab-pediatric.html','daytime-testing':'lab-daytime-testing.html',troubleshooting:'lab-troubleshooting.html','mentoring-diagnostic':'mentoring-diagnostic.html','math-coach':'math-coach.html'})) {
  assert.equal(ready.find(lab=>lab.id===id).plannedRoute,route);
}
const artifact=ready.find(lab=>lab.id==='artifact');
assert.deepEqual(artifact.taskCodes,['D2B','D2C','D3A','D3C']);
assert.equal(artifact.legacyHref,null);

const legacyHookupProgress={completed:['hookup'],started:{pap:{startedAt:'2026-08-02'}},catalogIndex:1};
const before=JSON.stringify(legacyHookupProgress);
const legacyReport=engine.summarize(catalog,legacyHookupProgress);
assert.equal(JSON.stringify(legacyHookupProgress),before);
assert.equal(legacyReport.counts.total,13);
assert.equal(legacyReport.counts.completed,0,'A legacy Hookup completion flag must not satisfy the new demonstrated-skill standard.');
assert.equal(legacyReport.counts.started,1);
assert.equal(legacyReport.counts.reviewStage,8);
assert.equal(legacyReport.counts.v3Ready,13);
assert.equal(legacyReport.last.id,'ekg');
assert.equal(legacyReport.rows.find(row=>row.id==='hookup').completed,false);
assert.equal(legacyReport.rows.find(row=>row.id==='pap').started,true);
assert.equal(legacyReport.rows.find(row=>row.id==='pap').reviewStage,true);

const demonstratedHookupProgress={
  completed:['hookup'],
  hookup:{skillVersion:2,skillsCompleted:true,quizPassed:true,completed:true},
  started:{hookup:{startedAt:'2026-08-02'}}
};
const demonstratedReport=engine.summarize(catalog,demonstratedHookupProgress);
assert.equal(demonstratedReport.rows.find(row=>row.id==='hookup').completed,true);
assert.equal(demonstratedReport.counts.completed,1);

const objectProgress=engine.normalizeProgress({
  ekg:{completed:true},
  visual:{status:'in-progress'},
  artifact:{completed:true},
  scoring:{completed:true},
  respiratory:{completed:true},
  instrumentation:{completed:true},
  pap:{completed:true},
  pediatric:{completed:true},
  'daytime-testing':{completed:true},
  troubleshooting:{completed:true}
});
assert.ok(!objectProgress.completed.includes('ekg'));
assert.ok(!objectProgress.completed.includes('visual'));
assert.ok(objectProgress.completed.includes('artifact'));
assert.ok(!objectProgress.completed.includes('scoring'));
assert.ok(!objectProgress.completed.includes('respiratory'));
assert.ok(!objectProgress.completed.includes('instrumentation'));
assert.ok(!objectProgress.completed.includes('pap'));
assert.ok(!objectProgress.completed.includes('pediatric'));
assert.ok(!objectProgress.completed.includes('daytime-testing'));
assert.ok(!objectProgress.completed.includes('troubleshooting'));
assert.ok(!objectProgress.completed.includes('hookup'));

const reviewStageReport=engine.summarize(catalog,{
  completed:['ekg','scoring','respiratory','pap','instrumentation','pediatric','daytime-testing','troubleshooting'],
  ekg:{completed:true},scoring:{completed:true},respiratory:{completed:true},pap:{completed:true},instrumentation:{completed:true},pediatric:{completed:true},'daytime-testing':{completed:true},troubleshooting:{completed:true}
});
assert.equal(reviewStageReport.counts.completed,0,'Checklist-stage lab records must not inflate demonstrated completion.');
assert.ok(reviewStageReport.rows.filter(row=>row.reviewStage).every(row=>row.completed===false));

console.log('Laboratory catalog passed with 13 internal routes, eight explicit review-stage labs, Artifact/Visual interaction packs, and demonstrated Hookup completion rules.');
