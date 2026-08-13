import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');
const [studyHtml,studyJs,presentationJs,surfaceGuard,modulePolish,achievementCss,reportsHtml,reportJs]=await Promise.all([
  readFile(join(root,'study.html'),'utf8'),readFile(join(root,'core','study.js'),'utf8'),readFile(join(root,'core','study-presentation.js'),'utf8'),readFile(join(root,'core','learner-surface-guard.js'),'utf8'),readFile(join(root,'assets','module-polish.css'),'utf8'),readFile(join(root,'assets','guided-study-achievements.css'),'utf8'),readFile(join(root,'reports.html'),'utf8'),readFile(join(root,'core','guided-trail-report.js'),'utf8')
]);
for(const selector of ['data-guided-trail-dashboard','data-checkpoint-overlay','data-checkpoint-workspace','data-blueprint-map','data-achievement-overlay','data-achievement-modal','data-achievement-content']) if(!studyHtml.includes(selector)) throw new Error(`Guided Study page is missing ${selector}.`);
for(const asset of ['assets/module-polish.css','assets/guided-study-achievements.css','core/learner-surface-guard.js','core/guided-trail-engine.js','core/study.js','core/study-presentation.js']) if(!studyHtml.includes(asset)) throw new Error(`Guided Study page does not load ${asset}.`);
if(studyHtml.indexOf('core/guided-trail-engine.js')>studyHtml.indexOf('core/study.js')) throw new Error('Guided Trail engine must load before the controller.');
if(studyHtml.indexOf('core/study.js')>studyHtml.indexOf('core/study-presentation.js')) throw new Error('Guided Study learner presentation must attach after the controller.');
for(const token of ['data-trail-mark','data-checkpoint-start','data-checkpoint-next','data-checkpoint-score','data-coach-toggle','coachBobNote','gradeCheckpoint','applyCheckpoint','showAchievement','closeAchievement','data-achievement-close']) if(!studyJs.includes(token)) throw new Error(`Guided Study controller is missing ${token}.`);
if(!studyHtml.includes('15-question badge checkpoint')||!studyJs.includes('badgeQuestionCount')) throw new Error('Guided Study badge flow must visibly require the 15-question checkpoint.');
if(!/\.achievement-overlay\{[^}]*z-index:2400/.test(achievementCss)) throw new Error('Achievement overlay must remain above the checkpoint and other Guided Study modals.');
if(!achievementCss.includes('body.achievement-open')||!studyJs.includes('state.achievementOpen')) throw new Error('Achievement modal state or scroll protection is missing.');
for(const learnerMarker of ['Guild task badges','named Guild domain medal','Sleep Pathways Guild educational achievements']) if(!studyHtml.includes(learnerMarker)) throw new Error(`Guided Study learner copy is missing ${learnerMarker}.`);
for(const marker of ['Task badges','Domain medals','Clinical Guide','Study Signal Scout','Scoring Pathfinder','Therapy Trail Guide','Show mapped resource keys','mapping-warning']) if(!presentationJs.includes(marker)) throw new Error(`Guided Study presentation protection is missing ${marker}.`);
if(!presentationJs.includes("details.remove()")||!presentationJs.includes("node.remove()")) throw new Error('Guided Study presentation does not suppress raw resource-key and mapping-review UI.');
if(!surfaceGuard.includes('optional book suggestions')||!surfaceGuard.includes("getElementById('rpsgt-book-shelf')")) throw new Error('Shared learner surface guard no longer suppresses the legacy optional shelf.');
if(/RPSGTStorage|localStorage\.(?:setItem|removeItem|clear)/.test(surfaceGuard)) throw new Error('Learner surface guard must stay presentation-only and storage-independent.');
new Function(studyJs);new Function(presentationJs);new Function(surfaceGuard);
if(!modulePolish.includes('body[data-module="study"] .hero')||!modulePolish.includes('@media(max-width:760px)')) throw new Error('Shared module density polish is missing desktop or mobile Guided Study coverage.');
if(!reportsHtml.includes('data-guided-trail-report')||!reportsHtml.includes('core/guided-trail-report.js')) throw new Error('Reports page is missing Guided Study parity wiring.');
if(/RPSGTStorage\.save|localStorage\.(?:setItem|removeItem|clear)/.test(reportJs)) throw new Error('Guided Study report controller must remain read only.');
if(!reportJs.includes('engine.summary')) throw new Error('Guided Study report must derive its display from the pure engine.');
console.log('Guided Study 15-question badges, frontmost achievement overlay, study/report shell, learner surface, module polish, source-key suppression, syntax, and read-only contracts passed.');