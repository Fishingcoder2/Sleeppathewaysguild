(function(){
  'use strict';
  const engine=window.RPSGTRespiratoryLabEngine;
  const workspace=document.querySelector('[data-respiratory-workspace]');
  const summaryHost=document.querySelector('[data-respiratory-summary]');
  const stationHost=document.querySelector('[data-respiratory-stations]');
  const patternHost=document.querySelector('[data-respiratory-patterns]');
  const patternDetail=document.querySelector('[data-respiratory-pattern-detail]');
  const startButton=document.querySelector('[data-respiratory-start]');
  if(!workspace||!summaryHost||!stationHost||!patternHost||!patternDetail||!startButton) return;
  const state={saved:null,questions:[],bank:[],activePattern:'obstructive-hypopnea'};
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>value?new Date(value).toLocaleString():'Not recorded';
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw new Error(path+' HTTP '+response.status);return response.json();}
  function saveLabs(nextLabs){state.saved.labs=nextLabs;state.saved=window.RPSGTStorage.save(state.saved);}
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
    return ({normal:'Baseline amplitude',absent:'Nearly flat / absent',increased:'Preserved and increasing','paradox-increased':'Continued, stronger, partly paradoxical',mixed:'Absent first, then increasing','mixed-paradox':'Absent first, then paradoxical effort',reduced:'Reduced with airflow','reduced-flattened':'Clearly reduced + inspiratory flattening',flattened:'Inspiratory flattening',steady:'Relatively steady',drop:'Delayed decrease'})[mode]||mode;
  }
  function wavePath(mode,channel,rowY){
    const points=[];const startX=112;const endX=730;const eventStart=300;const eventEnd=560;const count=180;
    const base={airflow:22,thorax:16,abdomen:16}[channel]||16;
    for(let index=0;index<count;index+=1){
      const x=startX+(endX-startX)*index/(count-1);const cycle=index/17*Math.PI*2;const inEvent=x>=eventStart&&x<=eventEnd;const progress=inEvent?(x-eventStart)/(eventEnd-eventStart):0;
      let amplitude=base;let phase=channel==='abdomen'?0.16:0;let value=Math.sin(cycle+phase);
      if(inEvent){
        if(mode==='absent'){amplitude=.8;}
        else if(mode==='reduced'){amplitude=base*.38;}
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
  function oxygenPath(mode,rowY){
    const points=[];const startX=112;const endX=730;const count=90;
    for(let index=0;index<count;index+=1){
      const x=startX+(endX-startX)*index/(count-1);let offset=Math.sin(index/8)*.7;
      if(mode==='drop'){
        if(x>=390&&x<560) offset+=(x-390)/170*15;
        else if(x>=560&&x<680) offset+=15-(x-560)/120*15;
      }
      points.push(`${index?'L':'M'}${x.toFixed(1)},${(rowY+offset).toFixed(1)}`);
    }
    return points.join(' ');
  }
  function patternSvg(pattern){
    const airflow=wavePath(pattern.airflow,'airflow',74);const thorax=wavePath(pattern.thorax,'thorax',142);const abdomen=wavePath(pattern.abdomen,'abdomen',210);const oxygen=oxygenPath(pattern.oxygen,278);
    return `<svg class="respiratory-trace" viewBox="0 0 760 322" role="img" aria-label="Original teaching schematic for ${esc(pattern.title)} showing nasal pressure airflow, thoracic effort, abdominal effort, and oxygen saturation"><rect class="trace-event-window" x="300" y="28" width="260" height="270" rx="12"></rect><text class="trace-event-label" x="430" y="21" text-anchor="middle">event window</text><g class="trace-guides"><line x1="108" y1="74" x2="735" y2="74"></line><line x1="108" y1="142" x2="735" y2="142"></line><line x1="108" y1="210" x2="735" y2="210"></line><line x1="108" y1="278" x2="735" y2="278"></line></g><g class="trace-labels"><text x="12" y="79">Nasal pressure</text><text x="12" y="147">Thorax</text><text x="12" y="215">Abdomen</text><text x="12" y="283">SpO₂</text></g><path class="trace-line airflow" d="${airflow}"></path><path class="trace-line thorax" d="${thorax}"></path><path class="trace-line abdomen" d="${abdomen}"></path><path class="trace-line oxygen" d="${oxygen}"></path>${pattern.oxygen==='drop'?'<text class="trace-oxygen-note" x="615" y="267">delayed O₂ drop</text>':''}</svg>`;
  }
  function renderPatternDetail(){
    const pattern=engine.patternById(state.activePattern);
    patternDetail.innerHTML=`<div class="respiratory-pattern-heading"><div><span class="status gold">Selected pattern</span><h3>${esc(pattern.title)}</h3><p class="respiratory-pattern-cue">${esc(pattern.cue)}</p></div></div>${patternSvg(pattern)}<div class="respiratory-signal-clues"><div><span>Airflow</span><strong>${esc(humanSignal(pattern.airflow))}</strong></div><div><span>Thorax</span><strong>${esc(humanSignal(pattern.thorax))}</strong></div><div><span>Abdomen</span><strong>${esc(humanSignal(pattern.abdomen))}</strong></div><div><span>Oxygen</span><strong>${esc(humanSignal(pattern.oxygen))}</strong></div></div><div class="respiratory-teaching-note"><strong>What to notice</strong><p>${esc(pattern.teaching)}</p></div>`;
  }
  function renderPatterns(){
    patternHost.innerHTML=engine.PATTERNS.map(pattern=>`<button class="respiratory-pattern-button ${pattern.id===state.activePattern?'active':''}" type="button" data-respiratory-pattern="${esc(pattern.id)}" aria-pressed="${pattern.id===state.activePattern?'true':'false'}"><strong>${esc(pattern.title)}</strong><span>${esc(pattern.cue)}</span></button>`).join('');
    renderPatternDetail();
  }
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
    state.questions.forEach(question=>{
      const group=form.elements.namedItem('respiratory-'+String(question.id));
      if(group&&group.value) answers[String(question.id)]=group.value;
    });
    const record=engine.gradeSession({questions:state.questions,answers,completedAt:new Date().toISOString()});saveLabs(engine.applySession(state.saved.labs,record));form.querySelectorAll('input,button').forEach(node=>node.disabled=true);renderResult(record);renderSummary();renderStations();
  }
  async function init(){
    try{
      if(!engine||!window.RPSGTStorage) throw new Error('A required Respiratory lab module is unavailable.');
      state.saved=window.RPSGTStorage.load();const modules=await Promise.all(['data/question-bank/d2a.json','data/question-bank/d2b.json','data/question-bank/d3b.json'].map(loadJson));state.bank=modules.flatMap(module=>module.questions||[]);
      if(engine.eligibleQuestions(state.bank).length<engine.SESSION_SIZE) throw new Error('The validated D2A/D2B/D3B banks do not contain enough eligible respiratory questions.');
      renderSummary();renderStations();renderPatterns();
    }catch(error){workspace.hidden=false;workspace.innerHTML=`<div class="notice error"><strong>Respiratory lab could not load.</strong> ${esc(error.message)} No learner progress was changed.</div>`;startButton.disabled=true;}
  }
  startButton.addEventListener('click',startSession);
  patternHost.addEventListener('click',event=>{const button=event.target.closest('[data-respiratory-pattern]');if(!button)return;state.activePattern=button.dataset.respiratoryPattern;renderPatterns();});
  stationHost.addEventListener('click',event=>{const button=event.target.closest('[data-respiratory-station]');if(!button||button.disabled)return;const report=engine.summary(state.saved.labs);const id=button.dataset.respiratoryStation;const next=!Boolean(report.checklist[id]);saveLabs(engine.setStation(state.saved.labs,id,next,new Date().toISOString()));renderSummary();renderStations();});
  document.addEventListener('click',event=>{if(event.target.closest('[data-respiratory-cancel]')){state.questions=[];workspace.hidden=true;workspace.innerHTML='';}});
  document.addEventListener('submit',event=>{if(event.target.matches('[data-respiratory-form]')){event.preventDefault();submit(event.target);}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
