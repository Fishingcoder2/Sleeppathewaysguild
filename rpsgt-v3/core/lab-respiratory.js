(function(){
  'use strict';
  const engine=window.RPSGTRespiratoryLabEngine;
  const workspace=document.querySelector('[data-respiratory-workspace]');
  const visualWorkspace=document.querySelector('[data-respiratory-visual-workspace]');
  const summaryHost=document.querySelector('[data-respiratory-summary]');
  const stationHost=document.querySelector('[data-respiratory-stations]');
  const patternHost=document.querySelector('[data-respiratory-patterns]');
  const patternDetail=document.querySelector('[data-respiratory-pattern-detail]');
  const startButton=document.querySelector('[data-respiratory-start]');
  const visualStartButtons=[...document.querySelectorAll('[data-respiratory-visual-start]')];
  if(!workspace||!visualWorkspace||!summaryHost||!stationHost||!patternHost||!patternDetail||!startButton) return;

  const state={saved:null,questions:[],bank:[],activePattern:'obstructive-hypopnea',visualCases:[],visualIndex:0,visualSelected:null,visualLocked:false,visualCorrect:0,visualFinished:false};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>value?new Date(value).toLocaleString():'Not recorded';

  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveLabs(nextLabs){state.saved.labs=nextLabs;state.saved=window.RPSGTStorage.save(state.saved);}
  function shuffleLocal(items){const copy=items.slice();for(let index=copy.length-1;index>0;index-=1){const swap=Math.floor(Math.random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]];}return copy;}

  function renderSummary(){
    const report=engine.summary(state.saved.labs);
    summaryHost.innerHTML=`<div><span>Status</span><strong>${report.completed?'Completed':report.status==='in-progress'?'In progress':'Not started'}</strong></div><div><span>Signal stations</span><strong>${report.stationsComplete}/${report.stationCount}</strong></div><div><span>Best checkpoint</span><strong>${report.attempts?report.bestPercent+'%':'—'}</strong></div><div><span>Attempts</span><strong>${report.attempts}</strong></div><div><span>Last checkpoint</span><strong>${report.latestSession?formatDate(report.latestSession.completedAt):'—'}</strong></div>`;
    startButton.textContent=report.attempts?'Start another 10-question checkpoint':'Start 10-question checkpoint';
    if(report.completed) startButton.textContent='Practice another 10-question checkpoint';
  }

  function renderStations(){
    const report=engine.summary(state.saved.labs);
    stationHost.innerHTML=engine.STATIONS.map((station,index)=>{
      const complete=Boolean(report.checklist[station.id]);
      return `<button class="respiratory-station ${complete?'complete':''}" type="button" data-respiratory-station="${esc(station.id)}" aria-pressed="${complete?'true':'false'}" ${report.completed?'disabled':''}><span class="respiratory-station-check" aria-hidden="true">${complete?'✓':'○'}</span><span class="respiratory-station-number">${index+1}</span><span class="respiratory-station-copy"><strong>${esc(station.title)}</strong><small>${esc(station.focus)}</small></span><span class="respiratory-station-action">${complete?'Reviewed':'Mark reviewed'}</span></button>`;
    }).join('');
  }

  function humanSignal(mode){
    return ({
      normal:'Baseline amplitude',
      absent:'Nearly flat / absent',
      increased:'Preserved and increasing',
      'paradox-increased':'Continued, stronger, partly paradoxical',
      mixed:'Absent first, then increasing',
      'mixed-paradox':'Absent first, then paradoxical effort',
      reduced:'Reduced with airflow',
      'reduced-flattened':'Clearly reduced + inspiratory flattening',
      flattened:'Inspiratory flattening',
      'subtle-reduction':'Only subtly reduced',
      'near-normal':'Near-baseline thermal excursion',
      baseline:'Mixed-frequency background',
      'terminal-arousal':'Mixed-frequency background with terminal EEG arousal',
      steady:'Relatively steady',
      drop:'Delayed decrease'
    })[mode]||mode;
  }

  function wavePath(mode,channel,rowY){
    const points=[];const startX=112;const endX=730;const eventStart=300;const eventEnd=560;const count=180;
    const base={airflow:22,thermal:17,thorax:16,abdomen:16}[channel]||16;
    for(let index=0;index<count;index+=1){
      const x=startX+(endX-startX)*index/(count-1);const cycle=index/17*Math.PI*2;const inEvent=x>=eventStart&&x<=eventEnd;const progress=inEvent?(x-eventStart)/(eventEnd-eventStart):0;
      let amplitude=base;let phase=channel==='abdomen'?0.16:channel==='thermal'?0.08:0;let value=Math.sin(cycle+phase);
      if(inEvent){
        if(mode==='absent'){amplitude=.8;}
        else if(mode==='reduced'){amplitude=base*.38;}
        else if(mode==='subtle-reduction'){amplitude=base*.78;}
        else if(mode==='near-normal'){amplitude=base*.94;}
        else if(mode==='reduced-flattened'){
          amplitude=base*.42;const raw=Math.sin(cycle+phase);value=raw>0?Math.min(raw,.28):raw*.82;
        }else if(mode==='flattened'){
          amplitude=base*.78;const raw=Math.sin(cycle+phase);value=raw>0?Math.min(raw,.30):raw;
        }else if(mode==='increased'){
          amplitude=base*(1.3+.48*progress);
        }else if(mode==='paradox-increased'){
          amplitude=base*(1.35+.42*progress);value=Math.sin(cycle+Math.PI);
        }else if(mode==='mixed'){
          if(progress<.48){amplitude=.8;}else{amplitude=base*(1.25+.5*((progress-.48)/.52));}
        }else if(mode==='mixed-paradox'){
          if(progress<.48){amplitude=.8;}else{amplitude=base*(1.3+.48*((progress-.48)/.52));value=Math.sin(cycle+Math.PI);}
        }
      }
      points.push(`${index?'L':'M'}${x.toFixed(1)},${(rowY-value*amplitude).toFixed(1)}`);
    }
    return points.join(' ');
  }

  function eegPath(mode,rowY){
    const points=[];const startX=112;const endX=730;const count=310;
    for(let index=0;index<count;index+=1){
      const x=startX+(endX-startX)*index/(count-1);
      const t=index/14;
      let value=Math.sin(t*2.1)*1.6+Math.sin(t*4.7+.8)*1.0+Math.sin(t*8.9+.25)*.55+Math.sin(index*1.71)*.35;
      let scale=1;
      if(mode==='terminal-arousal'&&x>=535&&x<=615){
        const envelope=Math.sin(Math.min(1,(x-535)/22)*Math.PI/2)*Math.sin(Math.min(1,(615-x)/20)*Math.PI/2);
        value+=Math.sin(index*2.85)*5.2*envelope+Math.sin(index*1.42)*2.2*envelope;
        scale=1.3;
      }
      points.push(`${index?'L':'M'}${x.toFixed(1)},${(rowY-value*scale).toFixed(1)}`);
    }
    return points.join(' ');
  }

  function oxygenSeries(pattern,rowY){
    const start=Number.isFinite(Number(pattern.spo2Start))?Number(pattern.spo2Start):97;
    const nadir=Number.isFinite(Number(pattern.spo2Nadir))?Number(pattern.spo2Nadir):start;
    const xs=[118,205,292,380,468,556,644,724];
    let values;
    if(pattern.oxygen==='drop'&&nadir<start){
      const depth=start-nadir;
      values=[start,start,start,Math.round(start-depth*.15),Math.round(start-depth*.5),Math.round(nadir),Math.round(nadir+depth*.35),Math.round(nadir+depth*.72)];
    }else values=xs.map(()=>start);
    const points=xs.map((x,index)=>{
      const y=rowY+(start-values[index])*3.6;
      return `${index?'L':'M'}${x},${y.toFixed(1)}`;
    }).join(' ');
    const labels=xs.map((x,index)=>`<text class="trace-spo2-value" x="${x}" y="${(rowY-11+(start-values[index])*3.6).toFixed(1)}" text-anchor="middle">${values[index]}</text>`).join('');
    return {path:points,labels,values};
  }

  function patternSvg(pattern,revealIdentity=true){
    const eeg=eegPath(pattern.eeg||'baseline',62);
    const airflow=wavePath(pattern.airflow,'airflow',126);
    const thermal=wavePath(pattern.thermal||'normal','thermal',190);
    const thorax=wavePath(pattern.thorax,'thorax',254);
    const abdomen=wavePath(pattern.abdomen,'abdomen',318);
    const oxygen=oxygenSeries(pattern,386);
    const aria=revealIdentity
      ?`Original teaching schematic for ${esc(pattern.title)} showing EEG, nasal pressure, thermistor thermal airflow, thoracic effort, abdominal effort, and numeric oxygen saturation trend`
      :'Unlabeled original respiratory teaching schematic showing EEG, nasal pressure, thermistor thermal airflow, thoracic effort, abdominal effort, and numeric oxygen saturation trend';
    const arousalNote=(pattern.eeg==='terminal-arousal')?'<text class="trace-arousal-note" x="580" y="40" text-anchor="middle">EEG arousal</text>':'';
    return `<svg class="respiratory-trace" viewBox="0 0 760 430" role="img" aria-label="${aria}"><rect class="trace-event-window" x="300" y="28" width="260" height="374" rx="12"></rect><text class="trace-event-label" x="430" y="21" text-anchor="middle">event window</text><g class="trace-guides"><line x1="108" y1="62" x2="735" y2="62"></line><line x1="108" y1="126" x2="735" y2="126"></line><line x1="108" y1="190" x2="735" y2="190"></line><line x1="108" y1="254" x2="735" y2="254"></line><line x1="108" y1="318" x2="735" y2="318"></line><line x1="108" y1="386" x2="735" y2="386"></line></g><g class="trace-labels"><text x="12" y="67">EEG</text><text x="12" y="131">Nasal pressure</text><text x="12" y="195">Thermistor</text><text x="12" y="259">Thorax</text><text x="12" y="323">Abdomen</text><text x="12" y="391">SpO₂</text></g><path class="trace-line eeg" d="${eeg}"></path><path class="trace-line airflow" d="${airflow}"></path><path class="trace-line thermal" d="${thermal}"></path><path class="trace-line thorax" d="${thorax}"></path><path class="trace-line abdomen" d="${abdomen}"></path><path class="trace-line oxygen" d="${oxygen.path}"></path>${oxygen.labels}${arousalNote}${pattern.oxygen==='drop'?'<text class="trace-oxygen-note" x="620" y="420">delayed SpO₂ decrease → recovery</text>':''}</svg>`;
  }

  function signalClues(pattern){
    return `<div class="respiratory-signal-clues"><div><span>EEG</span><strong>${esc(humanSignal(pattern.eeg||'baseline'))}</strong></div><div><span>Nasal pressure</span><strong>${esc(humanSignal(pattern.airflow))}</strong></div><div><span>Thermistor</span><strong>${esc(humanSignal(pattern.thermal||'normal'))}</strong></div><div><span>Thorax</span><strong>${esc(humanSignal(pattern.thorax))}</strong></div><div><span>Abdomen</span><strong>${esc(humanSignal(pattern.abdomen))}</strong></div><div><span>SpO₂</span><strong>${pattern.oxygen==='drop'?`${esc(String(pattern.spo2Start||97))}% → ${esc(String(pattern.spo2Nadir||93))}% → recovery`:'Numeric trend remains relatively steady'}</strong></div></div>`;
  }

  function renderPatternDetail(){
    const pattern=engine.patternById(state.activePattern);
    patternDetail.innerHTML=`<div class="respiratory-pattern-heading"><div><span class="status gold">Selected pattern</span><h3>${esc(pattern.title)}</h3><p class="respiratory-pattern-cue">${esc(pattern.cue)}</p></div></div>${patternSvg(pattern,true)}${signalClues(pattern)}<div class="respiratory-teaching-note"><strong>What to notice</strong><p>${esc(pattern.teaching)}</p></div>`;
  }

  function renderPatterns(){
    patternHost.innerHTML=engine.PATTERNS.map(pattern=>`<button class="respiratory-pattern-button ${pattern.id===state.activePattern?'active':''}" type="button" data-respiratory-pattern="${esc(pattern.id)}" aria-pressed="${pattern.id===state.activePattern?'true':'false'}"><strong>${esc(pattern.title)}</strong><span>${esc(pattern.cue)}</span></button>`).join('');
    renderPatternDetail();
  }

  function buildVisualCases(){
    const ids=shuffleLocal(engine.PATTERNS.map(pattern=>pattern.id));
    return ids.map(id=>{const distractors=shuffleLocal(engine.PATTERNS.filter(pattern=>pattern.id!==id).map(pattern=>pattern.id)).slice(0,3);return {patternId:id,optionIds:shuffleLocal([id,...distractors])};});
  }
  function visualCase(){return state.visualCases[state.visualIndex]||null;}

  function renderVisualChallenge(){
    visualWorkspace.hidden=false;
    if(state.visualFinished){
      const percent=Math.round(state.visualCorrect/Math.max(1,state.visualCases.length)*100);
      visualWorkspace.innerHTML=`<div class="respiratory-visual-result"><div class="eyebrow">Visual respiratory challenge complete</div><h3>${state.visualCorrect}/${state.visualCases.length} correct · ${percent}%</h3><p>Use the comparison gallery above to revisit any airflow-versus-effort relationship that was difficult. This visual score is practice feedback and does not change the formal Respiratory Lab completion rule.</p><div class="actions"><button class="btn primary" type="button" data-respiratory-visual-restart>Practice the visual challenge again</button><button class="btn secondary" type="button" data-respiratory-visual-close>Close visual challenge</button></div></div>`;
      return;
    }
    const item=visualCase();if(!item)return;const pattern=engine.patternById(item.patternId);const selected=state.visualSelected;
    const options=item.optionIds.map(id=>{const option=engine.patternById(id);let cls='respiratory-visual-choice';if(selected===id)cls+=' selected';if(state.visualLocked&&id===item.patternId)cls+=' correct';if(state.visualLocked&&selected===id&&id!==item.patternId)cls+=' incorrect';return `<button class="${cls}" type="button" data-respiratory-visual-answer="${esc(id)}" ${state.visualLocked?'disabled':''}>${esc(option.title)}</button>`;}).join('');
    const feedback=state.visualLocked?`<div class="respiratory-visual-feedback ${selected===item.patternId?'correct':'retry'}"><strong>${selected===item.patternId?'Correct':'Review'} · ${esc(pattern.title)}</strong><p>${esc(pattern.cue)}</p><p>${esc(pattern.teaching)}</p>${signalClues(pattern)}</div>`:'';
    const action=!state.visualLocked?'<button class="btn primary" type="button" data-respiratory-visual-check>Check visual answer</button>':state.visualIndex<state.visualCases.length-1?'<button class="btn primary" type="button" data-respiratory-visual-next>Next visual case</button>':'<button class="btn primary" type="button" data-respiratory-visual-finish>Finish visual challenge</button>';
    visualWorkspace.innerHTML=`<div class="respiratory-visual-case"><div class="respiratory-visual-progress"><span class="status gold">Case ${state.visualIndex+1} of ${state.visualCases.length}</span><strong>Which respiratory pattern best matches this tracing?</strong></div>${patternSvg(pattern,false)}<p class="respiratory-visual-prompt">Compare nasal pressure and thermistor airflow with thoracic and abdominal effort. If considering a RERA, confirm that the flow-limited sequence terminates in an EEG arousal. Use the numeric SpO₂ trend as supporting timing context.</p><div class="respiratory-visual-options" role="group" aria-label="Respiratory pattern answer choices">${options}</div>${feedback}<div class="actions">${action}<button class="btn secondary" type="button" data-respiratory-visual-close>Close visual challenge</button></div></div>`;
  }

  function startVisualChallenge(){state.visualCases=buildVisualCases();state.visualIndex=0;state.visualSelected=null;state.visualLocked=false;state.visualCorrect=0;state.visualFinished=false;renderVisualChallenge();visualWorkspace.scrollIntoView({behavior:'smooth',block:'start'});}
  function checkVisualAnswer(){const item=visualCase();if(!item||!state.visualSelected||state.visualLocked)return;state.visualLocked=true;if(state.visualSelected===item.patternId)state.visualCorrect+=1;renderVisualChallenge();}
  function nextVisualCase(){if(!state.visualLocked)return;state.visualIndex+=1;state.visualSelected=null;state.visualLocked=false;renderVisualChallenge();}

  function renderSession(){
    workspace.hidden=false;
    workspace.innerHTML=`<div class="section-head"><div><div class="eyebrow">D2A · D2B · D3B respiratory checkpoint</div><h2>Ten learner-practice questions</h2></div><button class="btn secondary" type="button" data-respiratory-cancel>Close checkpoint</button></div><p class="report-intro">This checkpoint draws respiratory-relevant learner questions from the validated setup, troubleshooting, and event-scoring banks.</p><form data-respiratory-form>${state.questions.map((question,index)=>`<fieldset class="respiratory-question"><legend><span>${index+1}</span>${esc(question.prompt)}</legend>${question.options.map(option=>`<label class="respiratory-option"><input type="radio" name="respiratory-${esc(question.id)}" value="${esc(option)}"><span>${esc(option)}</span></label>`).join('')}</fieldset>`).join('')}<div class="actions"><button class="btn primary" type="submit">Score respiratory checkpoint</button></div></form><div data-respiratory-result></div>`;
    workspace.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderResult(record){
    const host=workspace.querySelector('[data-respiratory-result]');const byId=new Map(state.questions.map(question=>[String(question.id),question]));
    const review=record.responses.map((response,index)=>{const question=byId.get(String(response.id));return `<details class="respiratory-review ${response.correct?'correct':'retry'}"><summary>${index+1}. ${response.correct?'Correct':'Review'} · ${esc(question&&question.topic||response.taskCode||'Respiratory')}</summary><p><strong>Answer:</strong> ${esc(question&&question.answer)}</p><p>${esc(question&&question.rationale||'Review the respiratory signal pathway and try another checkpoint.')}</p></details>`;}).join('');
    const report=engine.summary(state.saved.labs);
    host.innerHTML=`<div class="respiratory-result ${record.passed?'pass':'retry'}"><h3>${report.completed?'Respiratory lab completed':record.passed?'Checkpoint passed—finish the signal stations':'Checkpoint saved—review and retry'}</h3><strong>${record.correct}/${record.total} correct · ${record.percent}%</strong><p>${report.completed?'All seven signal stations and the checkpoint requirement are complete.':record.passed?'The 80% checkpoint requirement is complete. Finish every signal station to complete the lab.':'An 80% score is required. Your best score and attempt history remain preserved.'}</p></div><h3>Answer review</h3>${review}`;
  }

  function startSession(){
    saveLabs(engine.start(state.saved.labs,new Date().toISOString()));
    state.questions=engine.selectQuestions(state.bank,engine.SESSION_SIZE,'respiratory|'+new Date().toISOString());
    if(state.questions.length<engine.SESSION_SIZE){workspace.hidden=false;workspace.innerHTML='<div class="notice error"><strong>Respiratory checkpoint unavailable.</strong> Fewer than ten eligible respiratory learner-practice questions were found.</div>';return;}
    renderSummary();renderStations();renderSession();
  }

  function submit(form){
    const answers={};
    state.questions.forEach(question=>{const group=form.elements.namedItem('respiratory-'+String(question.id));if(group&&group.value) answers[String(question.id)]=group.value;});
    const record=engine.gradeSession({questions:state.questions,answers,completedAt:new Date().toISOString()});saveLabs(engine.applySession(state.saved.labs,record));form.querySelectorAll('input,button').forEach(node=>node.disabled=true);renderResult(record);renderSummary();renderStations();
  }

  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error('A required Respiratory lab module is unavailable.');
      state.saved=window.RPSGTStorage.load();const modules=await Promise.all(['data/question-bank/d2a.json','data/question-bank/d2b.json','data/question-bank/d3b.json'].map(loadJson));state.bank=modules.flatMap(module=>module.questions||[]);
      if(engine.eligibleQuestions(state.bank).length<engine.SESSION_SIZE) throw new Error('The validated D2A/D2B/D3B banks do not contain enough eligible respiratory questions.');
      renderSummary();renderStations();renderPatterns();
    }catch(error){workspace.hidden=false;workspace.innerHTML=`<div class="notice error"><strong>Respiratory lab could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;startButton.disabled=true;visualStartButtons.forEach(button=>button.disabled=true);}
  }

  startButton.addEventListener('click',startSession);
  visualStartButtons.forEach(button=>button.addEventListener('click',startVisualChallenge));
  patternHost.addEventListener('click',event=>{const button=event.target.closest('[data-respiratory-pattern]');if(!button)return;state.activePattern=button.dataset.respiratoryPattern;renderPatterns();});
  stationHost.addEventListener('click',event=>{const button=event.target.closest('[data-respiratory-station]');if(!button||button.disabled)return;const report=engine.summary(state.saved.labs);const id=button.dataset.respiratoryStation;const next=!Boolean(report.checklist[id]);saveLabs(engine.setStation(state.saved.labs,id,next,new Date().toISOString()));renderSummary();renderStations();});
  document.addEventListener('click',event=>{
    const visualAnswer=event.target.closest('[data-respiratory-visual-answer]');if(visualAnswer&&!state.visualLocked){state.visualSelected=visualAnswer.dataset.respiratoryVisualAnswer;renderVisualChallenge();return;}
    if(event.target.closest('[data-respiratory-visual-check]')){checkVisualAnswer();return;}
    if(event.target.closest('[data-respiratory-visual-next]')){nextVisualCase();return;}
    if(event.target.closest('[data-respiratory-visual-finish]')){state.visualFinished=true;renderVisualChallenge();return;}
    if(event.target.closest('[data-respiratory-visual-restart]')){startVisualChallenge();return;}
    if(event.target.closest('[data-respiratory-visual-close]')){visualWorkspace.hidden=true;visualWorkspace.innerHTML='';return;}
    if(event.target.closest('[data-respiratory-cancel]')){state.questions=[];workspace.hidden=true;workspace.innerHTML='';}
  });
  document.addEventListener('submit',event=>{if(event.target.matches('[data-respiratory-form]')){event.preventDefault();submit(event.target);}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
