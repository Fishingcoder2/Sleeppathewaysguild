import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,js,contextJs,multiJs,catalog,css,contextCss,multiCss,eventRenderer,eventEngine,contextRenderer,contextEngine,multiEngine,multiRenderer,contextPack,multiPack]=await Promise.all([
  readFile(join(root,'lab-scoring.html'),'utf8'),
  readFile(join(root,'core','lab-scoring.js'),'utf8'),
  readFile(join(root,'core','lab-scoring-context.js'),'utf8'),
  readFile(join(root,'core','lab-scoring-multi-epoch.js'),'utf8'),
  readFile(join(root,'data','labs','catalog.json'),'utf8').then(JSON.parse),
  readFile(join(root,'assets','scoring.css'),'utf8'),
  readFile(join(root,'assets','scoring-context.css'),'utf8'),
  readFile(join(root,'assets','scoring-multi-epoch.css'),'utf8'),
  readFile(join(root,'core','scoring-event-renderer.js'),'utf8'),
  readFile(join(root,'core','respiratory-timeline-engine.js'),'utf8'),
  readFile(join(root,'core','scoring-context-renderer.js'),'utf8'),
  readFile(join(root,'core','scoring-context-engine.js'),'utf8'),
  readFile(join(root,'core','scoring-multi-epoch-engine.js'),'utf8'),
  readFile(join(root,'core','scoring-multi-epoch-renderer.js'),'utf8'),
  readFile(join(root,'data','scoring','context-cases.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','scoring','multi-epoch-runs.json'),'utf8').then(JSON.parse)
]);

for(const selector of ['data-scoring-start','data-scoring-summary','data-scoring-stations','data-scoring-workspace','data-scoring-stage-start','data-scoring-stage-workspace','data-scoring-event-start','data-scoring-event-workspace','data-scoring-context-start','data-scoring-context-workspace','data-scoring-multi-start','data-scoring-multi-workspace']) if(!html.includes(selector)) throw new Error(`Scoring page is missing ${selector}.`);
for(const script of ['core/storage.js','core/scoring-lab-engine.js','core/scoring-context-engine.js','core/scoring-multi-epoch-engine.js','core/visual-psg-renderer.js','core/scoring-multi-epoch-renderer.js','core/respiratory-timeline-engine.js','core/scoring-event-renderer.js','core/artifact-psg-renderer.js','core/scoring-context-renderer.js','core/lab-scoring.js','core/lab-scoring-context.js','core/lab-scoring-multi-epoch.js']) if(!html.includes(script)) throw new Error(`Scoring page does not load ${script}.`);
for(const style of ['assets/scoring-context.css','assets/scoring-multi-epoch.css']) if(!html.includes(style)) throw new Error(`Scoring page must load ${style}.`);
if(html.indexOf('core/scoring-lab-engine.js')>html.indexOf('core/scoring-context-engine.js')||html.indexOf('core/scoring-context-engine.js')>html.indexOf('core/scoring-multi-epoch-engine.js')||html.indexOf('core/scoring-multi-epoch-engine.js')>html.indexOf('core/lab-scoring.js')) throw new Error('Scoring extensions must load after the base engine and before the Scoring controller.');
if(html.indexOf('core/visual-psg-renderer.js')>html.indexOf('core/scoring-multi-epoch-renderer.js')||html.indexOf('core/scoring-multi-epoch-renderer.js')>html.indexOf('core/lab-scoring-multi-epoch.js')) throw new Error('Phase 3 renderer must load after the shared PSG renderer and before its controller.');
if(html.indexOf('core/respiratory-timeline-engine.js')>html.indexOf('core/scoring-event-renderer.js')||html.indexOf('core/scoring-event-renderer.js')>html.indexOf('core/lab-scoring.js')) throw new Error('Event evidence engine/renderer must load before the Scoring controller.');
if(html.indexOf('core/artifact-psg-renderer.js')>html.indexOf('core/lab-scoring-context.js')||html.indexOf('core/scoring-context-renderer.js')>html.indexOf('core/lab-scoring-context.js')) throw new Error('Context renderers must load before the context controller.');

for(const token of ['data/question-bank/d3a.json','data/question-bank/d3b.json','data/question-bank/d3c.json','data/visual/prototype-sleep-staging.json','eligibleQuestions','selectQuestions','gradeSession','gradeStageSkill','applyStageSkill','gradeEventSkill','applyEventSkill','eventTimeline.checkEvidence','eventRenderer.hitTest','eventRenderer.render','setStation','applySession','RPSGTStorage.save']) if(!js.includes(token)) throw new Error(`Scoring controller is missing ${token}.`);
for(const answerSafety of ['data-option-index','question.options[optionIndex]','Your answer:','Correct answer:','Checkpoint not scored.','Answer all ${state.questions.length} questions']) if(!js.includes(answerSafety)) throw new Error(`Scoring answer-safety contract is missing ${answerSafety}.`);
for(const stageContract of ['First answer counts','data-scoring-stage-answer','data-scoring-stage-next','stageSkillBestPercent','The intended stage is']) if(!html.includes(stageContract)&&!js.includes(stageContract)) throw new Error(`Scoring staging-skill contract is missing ${stageContract}.`);
for(const eventContract of ['First classification counts','data-scoring-event-answer','data-scoring-event-show','data-scoring-event-next','eventSkillBestPercent','event-evidence','Show me','all ten waveform-evidence targets']) if(!html.includes(eventContract)&&!js.includes(eventContract)) throw new Error(`Scoring event-evidence contract is missing ${eventContract}.`);
for(const rendererContract of ['data-scoring-event-svg','target evidence','hitTest','spo2Percent','Nasal pressure','Thermistor','Thorax','Abdomen','SpO₂','respiratoryWave','absentSignal','centerHighlight','targetCenterX']) if(!eventRenderer.includes(rendererContract)&&!js.includes(rendererContract)) throw new Error(`Scoring event renderer is missing ${rendererContract}.`);
if(/const\s+breath\s*=\s*\(t,phase\)\s*=>\s*Math\.sin\(TAU\*t\/4/.test(eventRenderer)) throw new Error('Scoring event renderer regressed to fixed-period synthetic sine-wave breathing.');
if(!eventRenderer.includes('warped=t/4.05')||!eventRenderer.includes('const amplitude=0.94+')||!eventRenderer.includes('scroller.scrollLeft=')) throw new Error('Scoring event renderer must retain breath-to-breath variability and automatic Show-me centering.');
for(const evidenceId of ['obstructive-apnea-evidence','central-apnea-evidence','mixed-apnea-evidence','obstructive-hypopnea-evidence','rera-evidence']) if(!eventEngine.includes(evidenceId)) throw new Error(`Respiratory evidence engine is missing ${evidenceId}.`);

for(const contract of ['data/scoring/context-cases.json','data-scoring-context-answer','data-scoring-context-evidence-choice','data-scoring-context-show','gradeContextSkill','applyContextSkill','CONTEXT_EVIDENCE_PER_CASE','First decision counts','Show one clue','All 16 supporting clues','Swipe left/right to inspect the full']) if(!contextJs.includes(contract)&&!contextEngine.includes(contract)&&!html.includes(contract)) throw new Error(`Scoring context contract is missing ${contract}.`);
for(const family of ['arousal','limb-movement','artifact-physiology','transition-boundary']) if(!contextPack.cases.some(item=>item.family===family)) throw new Error(`Scoring context pack is missing ${family}.`);
if(contextPack.cases.length!==8||contextPack.cases.some(item=>item.evidence.filter(option=>option.correct===true).length!==2)) throw new Error('Scoring context pack must contain eight cases with two correct evidence clues each.');
for(const visualContract of ["kind==='limb'","kind==='boundary'",'arousalStart','legBursts','epochBoundary','Nasal pressure','L Leg','R Leg']) if(!contextRenderer.includes(visualContract)) throw new Error(`Scoring context renderer is missing ${visualContract}.`);

for(const contract of ['data/scoring/multi-epoch-runs.json','data-scoring-multi-trace','syncTraceScroll','applyScrollRatio','enableMouseDrag','scrollRatio','pointerType!==\'mouse\'','scrollLeft','data-scoring-multi-answer','data-scoring-multi-next','gradeMultiEpochSkill','applyMultiEpochSkill','MULTI_EPOCH_DECISION_COUNT','First answer counts','twelve neighboring-epoch decisions','does not yet change the Scoring Lab completion requirement','All three 30-second traces move together']) if(!multiJs.includes(contract)&&!multiEngine.includes(contract)&&!html.includes(contract)) throw new Error(`Scoring consecutive-epoch contract is missing ${contract}.`);
for(const rendererContract of ['RPSGTScoringMultiEpochRenderer','MIN_TRACE_WIDTH=1180','base.render','canvas.style.maxWidth=\'none\'','canvas.style.pointerEvents=\'none\'']) if(!multiRenderer.includes(rendererContract)) throw new Error(`Scoring consecutive-epoch renderer is missing ${rendererContract}.`);
if(multiJs.includes('data-scoring-multi-window')||multiJs.includes('No sideways scrolling required')) throw new Error('Phase 3 must use continuous scrolling rather than segmented ten-second window controls.');
if(!Array.isArray(multiPack.runs)||multiPack.runs.length!==4||multiPack.runs.some(run=>!Array.isArray(run.epochs)||run.epochs.length!==3)) throw new Error('Scoring Phase 3 pack must contain four three-epoch runs.');
if(multiPack.runs.flatMap(run=>run.epochs).length!==12) throw new Error('Scoring Phase 3 pack must contain twelve epoch decisions.');
for(const stage of ['W','N1','N2','N3','R']) if(!multiPack.runs.some(run=>run.epochs.some(epoch=>epoch.answer===stage))) throw new Error(`Scoring Phase 3 pack is missing stage ${stage}.`);
for(const storageContract of ['multiEpochSkillHistory','multiEpochSkillBestPercent','latestMulti','persistedLabs','applyContextSkill']) if(!multiEngine.includes(storageContract)) throw new Error(`Scoring Phase 3 persistence safeguard is missing ${storageContract}.`);

if(js.includes('study.title')) throw new Error('Internal stage-revealing study titles must not be rendered in the Scoring skill check.');
if(!js.includes('required>')) throw new Error('Every scoring radio group must be browser-required before submission.');
if(js.includes('<strong>Answer:</strong>')) throw new Error('Ambiguous result labeling must not return; show learner and correct answers separately.');
if(/localStorage\.(?:setItem|removeItem|clear)/.test(js)||/localStorage\.(?:setItem|removeItem|clear)/.test(contextJs)||/localStorage\.(?:setItem|removeItem|clear)/.test(multiJs)) throw new Error('Scoring controllers must write only through versioned RPSGT storage.');
if(!html.includes('do not reproduce or replace proprietary AASM scoring-manual text')||!html.includes('five-epoch staging skill')||!html.includes('all seven review stations')||!html.includes('sixteen supporting clues')||!html.includes('current official AASM Scoring Manual')||!html.includes('Phase 3 consecutive-epoch practice is currently tracked separately')) throw new Error('Scoring evidence and completion boundaries must be visible.');

for(const style of ['.scoring-stage-trace','.scoring-stage-options','.stage-correct','.stage-wrong','.scoring-event-trace','.scoring-event-options','.event-correct','.event-wrong','.scoring-event-highlight','overflow-x:auto']) if(!css.includes(style)) throw new Error(`Scoring skill CSS is missing ${style}.`);
for(const style of ['.scoring-context-trace','.scoring-context-scroll-cue','.scoring-context-options','.context-correct','.context-wrong','.scoring-context-evidence-options','.context-evidence-revealed','overflow-x:auto']) if(!contextCss.includes(style)) throw new Error(`Scoring context CSS is missing ${style}.`);
for(const style of ['.scoring-multi-scroll-guide','.scoring-multi-sequence','.scoring-multi-epoch-card','.scoring-multi-trace','.scoring-multi-stage-options','.multi-correct','.multi-wrong','overflow-x:auto','-webkit-overflow-scrolling:touch','touch-action:pan-x pan-y','scrollbar-gutter:stable','cursor:grab','.scoring-multi-trace.dragging']) if(!multiCss.includes(style)) throw new Error(`Scoring consecutive-epoch scroll CSS is missing ${style}.`);
if(multiCss.includes('.scoring-multi-trace{overflow:hidden')) throw new Error('Phase 3 must not hide horizontal overflow.');

const lab=catalog.labs.find(item=>item.id==='scoring');
if(!lab||lab.status!=='v3-ready'||lab.plannedRoute!=='lab-scoring.html') throw new Error('The laboratory catalog does not route the v3-ready Scoring lab.');

console.log('Scoring page, five-stage skill, Phase 3 four-run consecutive-epoch practice with synchronized touch/mouse horizontal scrolling, five-case respiratory event-evidence skill, eight-case scoring-context skill with sixteen supporting clues, biologic respiratory variability, canonical checkpoint capture, AASM-first boundaries, storage isolation, script order, and catalog route contracts passed.');
