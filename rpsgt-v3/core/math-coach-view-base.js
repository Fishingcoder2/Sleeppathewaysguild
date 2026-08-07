(function(root){
  'use strict';
  const app=root.RPSGTMathCoachApp=root.RPSGTMathCoachApp||{};
  app.configure=function(options){
    app.engine=options.engine;app.summaryHost=options.summaryHost;app.catalogHost=options.catalogHost;app.workspace=options.workspace;app.awardOverlay=options.awardOverlay;app.awardHost=options.awardHost;
    app.state={saved:null,catalog:null,currentSkill:null,guidedFeedback:null,setFeedback:null,returnFocus:null};
  };
  app.esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  app.formatDate=value=>value?new Date(value).toLocaleDateString():'Not yet';
  app.skillById=id=>(app.state.catalog.skills||[]).find(skill=>skill.id===id)||null;
  app.recordFor=id=>app.engine.normalizeState(app.state.saved.mathCoach,app.state.catalog).skills[id];
  app.statusLabel=record=>record.status==='mastered'?'Mastered':record.status==='in-progress'?'In progress':'Not started';
  app.stageLabel=stage=>({learn:'Learn the formula',worked:'Worked example',guided:'Try it with help',independent:'Independent practice',mastery:'Mastery check',complete:'Mastered'})[stage]||'Learn the formula';
  app.renderSummary=function(){
    const report=app.engine.summary(app.state.saved.mathCoach,app.state.catalog);const best=Math.max(0,...report.rows.map(row=>row.bestMasteryPercent||0));
    app.summaryHost.innerHTML=`<div><span>Curated skills</span><strong>${report.counts.total}</strong></div><div><span>Started</span><strong>${report.counts.started}</strong></div><div><span>Mastered</span><strong>${report.counts.mastered}</strong></div><div><span>Best mastery score</span><strong>${best?best+'%':'—'}</strong></div>`;
  };
  app.renderCatalog=function(){
    const report=app.engine.summary(app.state.saved.mathCoach,app.state.catalog);
    app.catalogHost.innerHTML=report.rows.map(row=>`<article class="card math-skill-card ${row.status==='mastered'?'mastered':''}"><div class="math-skill-head"><div><span class="status ${row.status==='mastered'?'green':row.status==='in-progress'?'gold':''}">${app.statusLabel(row)}</span><h2>${app.esc(row.title)}</h2><p>${app.esc(row.category)}</p></div><span class="math-skill-symbol" aria-hidden="true">${row.status==='mastered'?'🏅':'∑'}</span></div><div class="math-skill-progress"><span>Next step</span><strong>${app.stageLabel(row.stage)}</strong></div><div class="math-skill-metrics"><span>Best mastery: <b>${row.masteryAttempts?row.bestMasteryPercent+'%':'—'}</b></span><span>Checks: <b>${row.masteryAttempts}</b></span></div><button class="btn ${row.status==='not-started'?'primary':'secondary'}" type="button" data-math-open="${app.esc(row.id)}">${row.status==='not-started'?'Begin skill':row.status==='mastered'?'Review skill':'Continue skill'}</button></article>`).join('');
  };
  app.renderResources=skill=>`<section class="math-resources"><h3>Recommended study resources</h3><ul>${(skill.studyResources||[]).map(resource=>`<li><strong>${app.esc(resource.title)}</strong><span>${app.esc(resource.section)}</span></li>`).join('')}</ul></section>`;
  app.stageHeader=function(skill,record,label){return `<div class="math-workspace-head"><div><span class="status gold">${app.esc(label)}</span><h2>${app.esc(skill.title)}</h2><p>${app.esc(skill.topic)}</p></div><button class="btn secondary" type="button" data-math-exit>Exit</button></div><div class="math-stage-progress" aria-label="Math Coach learning stages">${app.engine.STAGES.slice(0,5).map((stage,index)=>`<span class="${stage===record.stage?'active':''} ${app.engine.STAGES.indexOf(record.stage)>index||record.status==='mastered'?'done':''}">${index+1}<small>${app.esc(app.stageLabel(stage))}</small></span>`).join('')}</div>`;};
  app.renderLearn=function(skill,record){
    app.workspace.innerHTML=`${app.stageHeader(skill,record,'Learn the formula')}<div class="math-lesson-grid"><article class="math-formula-card"><span>Formula or rule</span><code>${app.esc(skill.formula)}</code>${skill.alternateFormula?`<p>${app.esc(skill.alternateFormula)}</p>`:''}<strong>Answer unit: ${app.esc(skill.unit)}</strong></article><article class="card"><h3>What it means</h3><p>${app.esc(skill.lesson)}</p><div class="math-memory-clue"><strong>Memory clue</strong><span>${app.esc(skill.memoryClue)}</span></div></article></div><article class="card section"><h3>Define the variables and units</h3><div class="math-variable-grid">${skill.variables.map(variable=>`<div><strong>${app.esc(variable.symbol)}</strong><span>${app.esc(variable.meaning)}</span><small>${app.esc(variable.unit)}</small></div>`).join('')}</div></article><aside class="coach-card math-coach-note section"><span class="status gold">Coach Bob</span><h3>Set up the problem before calculating.</h3><p>${app.esc(skill.coachBobNote)}</p></aside>${app.renderResources(skill)}<div class="math-stage-actions"><button class="btn primary" type="button" data-math-stage="worked">See a worked example</button></div>`;
  };
  app.renderWorked=function(skill,record){
    app.workspace.innerHTML=`${app.stageHeader(skill,record,'Worked example')}<article class="card math-worked"><h3>${app.esc(skill.workedExample.prompt)}</h3><ol>${skill.workedExample.steps.map(step=>`<li>${app.esc(step)}</li>`).join('')}</ol><div class="math-worked-answer"><span>Answer</span><strong>${app.esc(skill.workedExample.answer)}</strong></div></article><aside class="coach-card math-coach-note section"><span class="status gold">Coach Bob</span><h3>Follow the unit trail.</h3><p>Each numbered step should change only one thing: convert the time, apply the formula, then attach the requested unit.</p></aside><div class="math-stage-actions"><button class="btn secondary" type="button" data-math-stage="learn">Back to lesson</button><button class="btn primary" type="button" data-math-stage="guided">Try it with help</button></div>`;
  };
})(window);
