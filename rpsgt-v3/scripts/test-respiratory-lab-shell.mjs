import {readFile} from 'node:fs/promises';import {dirname,join} from 'node:path';import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const root=join(here,'..');
const [html,js,css,traceCss,catalog,signalModel]=await Promise.all([
  readFile(join(root,'lab-respiratory.html'),'utf8'),
  readFile(join(root,'core','lab-respiratory.js'),'utf8'),
  readFile(join(root,'assets','respiratory.css'),'utf8'),
  readFile(join(root,'assets','respiratory-trace-enhancements.css'),'utf8'),
  readFile(join(root,'data','labs','catalog.json'),'utf8').then(JSON.parse),
  readFile(join(root,'core','respiratory-signal-model.js'),'utf8')
]);
for(const selector of ['data-respiratory-start','data-respiratory-visual-start','data-respiratory-visual-workspace','data-respiratory-summary','data-respiratory-patterns','data-respiratory-pattern-detail','data-respiratory-stations','data-respiratory-workspace']) if(!html.includes(selector)) throw new Error(`Respiratory page is missing ${selector}.`);
for(const script of ['core/storage.js','core/respiratory-lab-engine.js','core/respiratory-signal-model.js','core/lab-respiratory.js']) if(!html.includes(script)) throw new Error(`Respiratory page does not load ${script}.`);
if(!(html.indexOf('core/respiratory-lab-engine.js')<html.indexOf('core/respiratory-signal-model.js')&&html.indexOf('core/respiratory-signal-model.js')<html.indexOf('core/lab-respiratory.js'))) throw new Error('Respiratory engine, signal model, and controller script order is invalid.');
if(!html.includes('assets/respiratory-trace-enhancements.css')) throw new Error('Expanded respiratory trace stylesheet is not loaded.');
for(const token of ['data/question-bank/d2a.json','data/question-bank/d2b.json','data/question-bank/d3b.json','eligibleQuestions','selectQuestions','gradeSession','setStation','applySession','RPSGTStorage.save','patternSvg','wavePath','eegPath','oxygenSeries','data-respiratory-pattern','form.elements.namedItem']) if(!js.includes(token)) throw new Error(`Respiratory controller is missing ${token}.`);
for(const visualChallengeToken of ['buildVisualCases','renderVisualChallenge','startVisualChallenge','data-respiratory-visual-answer','data-respiratory-visual-check','data-respiratory-visual-next','data-respiratory-visual-finish','patternSvg(pattern,false)','Unlabeled original respiratory teaching schematic']) if(!js.includes(visualChallengeToken)) throw new Error(`Respiratory visual challenge is missing ${visualChallengeToken}.`);
if(js.includes('CSS.escape')) throw new Error('Respiratory checkpoint should not depend on CSS.escape for answer retrieval.');
if(/localStorage\.(?:setItem|removeItem|clear)/.test(js)) throw new Error('Respiratory controller must write only through versioned RPSGT storage.');
if(!html.includes('original teaching schematics')||!html.includes('all seven respiratory stations')||!html.includes('80% or higher')) throw new Error('Respiratory evidence and completion boundaries must be visible.');
if(!html.includes('Visual recognition challenge')||!html.includes('7 visual cases')||!html.includes('diagnosis stays hidden until you answer')) throw new Error('Respiratory visual-recognition learner framing is missing.');
if(!html.includes('terminates in a sustained faster-frequency EEG arousal')) throw new Error('RERA learner framing must require the current terminal sustained faster-frequency EEG arousal wording.');
if(!html.includes('thermistor/thermal airflow')||!html.includes('numeric SpO₂')) throw new Error('Thermistor and numeric SpO₂ learner framing is missing.');
if(!html.includes('Tap the whole card')||!js.includes("stationHost.addEventListener('click'")||!js.includes('<button class="respiratory-station')) throw new Error('Respiratory station controls are not implemented as reliable full-card buttons.');
for(const visualToken of ['trace-line eeg','trace-line airflow','trace-line thermal','trace-line thorax','trace-line abdomen','trace-line oxygen','trace-spo2-value','trace-arousal-note','EEG arousal']) if(!js.includes(visualToken)) throw new Error(`Respiratory teaching trace is missing ${visualToken}.`);
for(const modelToken of ["'obstructive-apnea':{thermal:'absent'","'obstructive-hypopnea':{thermal:'subtle-reduction'","'flow-limitation':{thermal:'near-normal',eeg:'terminal-arousal'",'Flow limitation by itself is not enough to call a RERA']) if(!signalModel.includes(modelToken)) throw new Error(`Respiratory signal model is missing ${modelToken}.`);
for(const interactionToken of ['touch-action:manipulation','min-height:68px','min-height:88px','min-height:48px','min-height:56px']) if(!css.includes(interactionToken)) throw new Error(`Respiratory touch-target styling is missing ${interactionToken}.`);
for(const visualStyle of ['.respiratory-visual-workspace','.respiratory-visual-options','.respiratory-visual-choice.selected','.respiratory-visual-choice.correct','.respiratory-visual-feedback']) if(!css.includes(visualStyle)) throw new Error(`Respiratory visual challenge styling is missing ${visualStyle}.`);
for(const traceStyle of ['.trace-line.eeg','.trace-line.thermal','.trace-spo2-value','.trace-arousal-note']) if(!traceCss.includes(traceStyle)) throw new Error(`Expanded respiratory trace styling is missing ${traceStyle}.`);
if(!css.includes('.respiratory-pattern-button.active')||!css.includes('.respiratory-option:has(input:checked)')) throw new Error('Respiratory selected-state styling is incomplete.');
const lab=catalog.labs.find(item=>item.id==='respiratory');if(!lab||lab.status!=='v3-ready'||lab.plannedRoute!=='lab-respiratory.html') throw new Error('The laboratory catalog does not route the v3-ready Respiratory lab.');
console.log('Respiratory page passed six-channel visual checks: EEG with RERA arousal, nasal pressure, thermistor, thorax, abdomen, numeric SpO2, seven-case recognition, interaction reliability, and evidence boundaries.');
