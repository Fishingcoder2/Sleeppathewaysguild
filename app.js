
(function(){
  'use strict';
  const APP_VERSION = 'v8.7.26-webapp-build';
  const BANK_VERSION = 'v8.7.22-live-1000';
  const STORAGE_PREFIX = 'spg_rpsgt_v2_';
  const SAFE_SETTINGS_KEYS = ['settings', 'agreementAccepted'];
  const LETTERS = ['A','B','C','D'];
  const domainNames = {
    '1': 'Domain 1: Clinical Overview / Patient Assessment',
    '2': 'Domain 2: Testing, Scoring, and Event Recognition',
    '3': 'Domain 3: PAP / Titration and Therapy Support',
    '4': 'Domain 4: Technical, Safety, and Professional Practice'
  };
  let state = {
    questions: [],
    filtered: [],
    quiz: null,
    selectedIndex: null,
    lastReport: null,
    settings: { sound: false }
  };
  const $ = (id) => document.getElementById(id);
  function save(key, value){ try { localStorage.setItem(STORAGE_PREFIX+key, JSON.stringify(value)); } catch(e){} }
  function load(key, fallback){ try { const v=localStorage.getItem(STORAGE_PREFIX+key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; } }
  function remove(key){ try { localStorage.removeItem(STORAGE_PREFIX+key); } catch(e){} }
  function toast(msg){ const old=$('toast'); if(old) old.remove(); const t=document.createElement('div'); t.id='toast'; t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), 4200); }
  function migrateStorage(){
    const meta = load('meta', null);
    const expected = APP_VERSION + '|' + BANK_VERSION + '|1000';
    if(!meta || meta.signature !== expected){
      const settings = load('settings', {sound:false});
      const agreementAccepted = load('agreementAccepted', false);
      Object.keys(localStorage).forEach(k => { if(k.startsWith(STORAGE_PREFIX) && !SAFE_SETTINGS_KEYS.some(x => k===STORAGE_PREFIX+x)) localStorage.removeItem(k); });
      save('settings', settings); save('agreementAccepted', agreementAccepted); save('meta', {signature: expected, migratedAt: new Date().toISOString()});
      if(meta) toast('The study bank was updated, so old quiz progress was reset. You are ready to continue.');
    }
  }
  function normalize(q){
    const release = String(q.release || '');
    const qtype = q.questionType || (release.includes('Batch 3') ? 'Best-Answer Reasoning' : release.includes('Batch 6') ? 'Mixed Mock Reserve' : 'Memory / Mastery');
    const cognitive = q.cognitiveLevel || (qtype.toLowerCase().includes('best') ? 'Apply/Analyze' : 'Recall');
    return {
      id: q.id,
      domain: String(q.domain || '').trim(),
      taskId: String(q.taskId || '').trim(),
      topic: q.topic || 'General RPSGT Review',
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options : [],
      answerIndex: Number(q.answerIndex),
      rationale: q.rationale || 'Review the related RPSGT blueprint topic and current official/professional references.',
      difficulty: q.difficulty || 'Exam',
      source: q.source || '',
      coachBob: q.coachBob || '',
      studyRedirect: q.studyRedirect || ('Review ' + (q.topic || 'this topic') + ' and repeat a short drill.'),
      questionType: qtype,
      cognitiveLevel: cognitive,
      release
    };
  }
  function init(){
    const data = window.RPSGT_BANK || { questions: [] };
    state.questions = (data.questions || []).map(normalize).filter(q => q.id && q.options.length === 4 && q.answerIndex >=0 && q.answerIndex < 4);
    migrateStorage();
    state.settings = load('settings', {sound:false});
    $('bankCount').textContent = state.questions.length.toLocaleString();
    $('bankVersion').textContent = BANK_VERSION;
    buildFilters();
    bindEvents();
    showHome();
    maybeShowAgreement();
  }
  function bindEvents(){
    document.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => startMode(btn.dataset.mode)));
    $('homeBtn').addEventListener('click', showHome);
    $('nextBtn').addEventListener('click', nextQuestion);
    $('submitMockBtn').addEventListener('click', submitMock);
    $('resetProgressBtn').addEventListener('click', resetProgress);
    $('exportReportBtn').addEventListener('click', exportReport);
    $('startFilteredBtn').addEventListener('click', () => startMode('practice'));
    $('acceptAgreementBtn').addEventListener('click', () => { save('agreementAccepted', true); $('agreementModal').classList.add('hidden'); });
    $('closeAgreementBtn').addEventListener('click', () => $('agreementModal').classList.add('hidden'));
    $('soundToggle').addEventListener('click', toggleSound);
    $('modeSize').addEventListener('change', () => {});
  }
  function maybeShowAgreement(){
    if(!load('agreementAccepted', false)) $('agreementModal').classList.remove('hidden');
  }
  function toggleSound(){ state.settings.sound = !state.settings.sound; save('settings', state.settings); toast('Sound is ' + (state.settings.sound ? 'on.' : 'off.')); }
  function beep(ok){
    if(!state.settings.sound) return;
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const o=ctx.createOscillator(); const g=ctx.createGain();
      o.frequency.value= ok ? 740 : 220; g.gain.value=.05; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{o.stop(); ctx.close();}, 120);
    } catch(e){}
  }
  function buildFilters(){
    const domains = [...new Set(state.questions.map(q=>q.domain))].sort();
    const tasks = [...new Set(state.questions.map(q=>q.taskId))].sort();
    const types = [...new Set(state.questions.map(q=>q.questionType))].sort();
    fillSelect($('domainFilter'), [['all','All domains'], ...domains.map(d=>[d, domainNames[d] || ('Domain '+d)])]);
    fillSelect($('taskFilter'), [['all','All tasks'], ...tasks.map(t=>[t,t])]);
    fillSelect($('typeFilter'), [['all','All question types'], ...types.map(t=>[t,t])]);
  }
  function fillSelect(sel, pairs){ sel.innerHTML=''; pairs.forEach(([v,txt])=>{ const o=document.createElement('option'); o.value=v; o.textContent=txt; sel.appendChild(o); }); }
  function showHome(){
    $('homeView').classList.remove('hidden');
    $('quizView').classList.add('hidden');
    $('reportView').classList.add('hidden');
    $('reviewView').classList.add('hidden');
    updateDashboard();
  }
  function updateDashboard(){
    const missed = load('missedIds', []);
    const completed = load('completedSessions', []);
    $('missedCount').textContent = missed.length;
    $('completedCount').textContent = completed.length;
    const byDomain = countBy(state.questions, q=>q.domain);
    $('domainSummary').innerHTML = Object.keys(byDomain).sort().map(d=>`<span class="pill">D${escapeHtml(d)}: ${byDomain[d]}</span>`).join(' ');
  }
  function getFiltered(){
    const d=$('domainFilter').value, t=$('taskFilter').value, type=$('typeFilter').value;
    return state.questions.filter(q => (d==='all'||q.domain===d) && (t==='all'||q.taskId===t) && (type==='all'||q.questionType===type));
  }
  function startMode(mode){
    let pool = getFiltered();
    let size = Number($('modeSize').value || 10);
    let title = 'Practice Questions';
    let immediate = true;
    if(mode==='readiness'){ pool = state.questions; size = 25; title = 'Readiness Check'; }
    if(mode==='best'){ pool = state.questions.filter(q => isBestAnswer(q)); size = Math.min(size, 10); title='Best-Answer Training'; }
    if(mode==='mock'){ pool = state.questions; size = Number($('mockSize').value || 50); title='Mock Exam Practice'; immediate=false; }
    if(mode==='missed'){ return showMissedReview(); }
    if(mode==='studyplan'){ return showStudyPlan(); }
    if(pool.length === 0){ toast('No questions match those filters.'); return; }
    const picked = takeRandom(pool, Math.min(size, pool.length));
    state.quiz = { mode, title, immediate, questions: picked, answers: Array(picked.length).fill(null), index:0, startedAt: new Date().toISOString(), completed:false };
    state.selectedIndex = null;
    $('homeView').classList.add('hidden'); $('reportView').classList.add('hidden'); $('reviewView').classList.add('hidden'); $('quizView').classList.remove('hidden');
    renderQuestion();
  }
  function isBestAnswer(q){
    const s = [q.questionType, q.cognitiveLevel, q.question, q.release].join(' ').toLowerCase();
    return s.includes('best') || s.includes('critical') || s.includes('analyze') || s.includes('next action') || s.includes('best next') || s.includes('batch 3');
  }
  function renderQuestion(){
    const quiz=state.quiz; if(!quiz) return;
    const q=quiz.questions[quiz.index];
    $('quizTitle').textContent = quiz.title;
    $('quizPosition').textContent = `Question ${quiz.index+1} of ${quiz.questions.length}`;
    $('progressBar').style.width = ((quiz.index)/quiz.questions.length*100)+'%';
    $('questionMeta').innerHTML = [
      `D${q.domain}`, q.taskId, q.topic, q.difficulty, q.questionType
    ].filter(Boolean).map(x=>`<span class="pill">${escapeHtml(x)}</span>`).join('');
    $('questionText').textContent = q.question;
    $('answers').innerHTML = '';
    q.options.forEach((opt, i)=>{
      const btn=document.createElement('button'); btn.className='answer-btn'; btn.type='button';
      btn.innerHTML = `<span class="answer-letter">${LETTERS[i]}.</span><span>${escapeHtml(opt)}</span>`;
      btn.addEventListener('click', () => chooseAnswer(i)); $('answers').appendChild(btn);
    });
    $('feedback').className='feedback hidden'; $('feedback').innerHTML='';
    $('nextBtn').classList.add('hidden'); $('submitMockBtn').classList.toggle('hidden', quiz.immediate || quiz.index < quiz.questions.length-1);
    if(!quiz.immediate && quiz.answers[quiz.index] !== null) markSelectedOnly(quiz.answers[quiz.index]);
  }
  function chooseAnswer(i){
    const quiz=state.quiz, q=quiz.questions[quiz.index];
    quiz.answers[quiz.index]=i;
    if(quiz.immediate){
      showFeedback(q, i);
      updateMissed(q, i !== q.answerIndex);
      $('nextBtn').classList.remove('hidden');
      markAnswerButtons(q, i);
      beep(i===q.answerIndex);
    } else {
      markSelectedOnly(i);
      if(quiz.index < quiz.questions.length - 1){ setTimeout(nextQuestion, 180); } else { $('submitMockBtn').classList.remove('hidden'); }
    }
  }
  function markSelectedOnly(i){ document.querySelectorAll('.answer-btn').forEach((b,idx)=> b.classList.toggle('selected', idx===i)); }
  function markAnswerButtons(q, selected){
    document.querySelectorAll('.answer-btn').forEach((b,idx)=>{
      b.disabled=true;
      if(idx===q.answerIndex) b.classList.add('correct');
      if(idx===selected && idx!==q.answerIndex) b.classList.add('incorrect');
    });
  }
  function showFeedback(q, selected){
    const correct = selected === q.answerIndex;
    const fb=$('feedback'); fb.className='feedback '+(correct?'correct':'incorrect');
    fb.innerHTML = `
      <h3>${correct ? 'Correct' : 'Review this one'}</h3>
      <p><strong>Correct answer:</strong> ${LETTERS[q.answerIndex]}. ${escapeHtml(q.options[q.answerIndex])}</p>
      <p><strong>Rationale:</strong> ${escapeHtml(q.rationale)}</p>
      ${q.coachBob ? `<div class="coach"><strong>Coach Bob:</strong> ${escapeHtml(q.coachBob)}</div>` : ''}
      <p class="small"><strong>Study redirect:</strong> ${escapeHtml(q.studyRedirect || ('Review '+q.topic+'.'))}</p>`;
    fb.classList.remove('hidden');
  }
  function nextQuestion(){
    const quiz=state.quiz;
    if(!quiz) return;
    if(quiz.index < quiz.questions.length-1){ quiz.index++; renderQuestion(); window.scrollTo({top:0, behavior:'smooth'}); }
    else finishQuiz();
  }
  function submitMock(){
    const unanswered = state.quiz.answers.filter(a=>a===null).length;
    if(unanswered && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
    state.quiz.questions.forEach((q,idx)=> updateMissed(q, state.quiz.answers[idx] !== q.answerIndex));
    finishQuiz();
  }
  function finishQuiz(){
    const quiz=state.quiz; quiz.completed=true; $('progressBar').style.width='100%';
    const report = buildReport(quiz); state.lastReport = report;
    const sessions = load('completedSessions', []); sessions.push({ mode:quiz.mode, title:quiz.title, score:report.score, total:report.total, percent:report.percent, finishedAt:new Date().toISOString()}); save('completedSessions', sessions.slice(-50));
    renderReport(report); beep(report.percent>=70);
  }
  function buildReport(quiz){
    const rows=quiz.questions.map((q,i)=>({ q, selected: quiz.answers[i], correct: quiz.answers[i]===q.answerIndex }));
    const correct=rows.filter(r=>r.correct).length;
    return { title:quiz.title, score:correct, total:rows.length, percent: Math.round(correct/rows.length*100), rows, domain: summarize(rows,'domain'), task: summarize(rows,'taskId'), topicMisses: topicMisses(rows) };
  }
  function summarize(rows, key){
    const out={}; rows.forEach(r=>{ const k=r.q[key]||'Other'; out[k]=out[k]||{total:0, correct:0}; out[k].total++; if(r.correct) out[k].correct++; }); return out;
  }
  function topicMisses(rows){
    const missed=rows.filter(r=>!r.correct); const c=countBy(missed, r=>r.q.topic||'General');
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,8);
  }
  function renderReport(report){
    $('quizView').classList.add('hidden'); $('homeView').classList.add('hidden'); $('reviewView').classList.add('hidden'); $('reportView').classList.remove('hidden');
    const passLine = report.percent >= 85 ? 'Strong work. Keep reviewing missed items and build stamina.' : report.percent >= 70 ? 'Good progress. Focus on the weak areas below.' : 'This is useful diagnostic information. Study the weak areas, then retest.';
    $('reportContent').innerHTML = `
      <h2>${escapeHtml(report.title)} Report</h2>
      <div class="status-row"><span class="pill">Score: ${report.score}/${report.total}</span><span class="pill">${report.percent}%</span></div>
      <div class="coach"><strong>Coach Bob:</strong> ${escapeHtml(passLine)} A score is a map. It tells you where to walk next.</div>
      <h3>Domain breakdown</h3>${summaryTable(report.domain, 'Domain')}
      <h3>Task breakdown</h3>${summaryTable(report.task, 'Task')}
      <h3>Top study redirects from missed items</h3>${report.topicMisses.length ? '<ul>'+report.topicMisses.map(([t,n])=>`<li>${escapeHtml(t)} — ${n} missed</li>`).join('')+'</ul>' : '<p>No missed topics in this set.</p>'}
    `;
  }
  function summaryTable(obj, label){
    const rows=Object.entries(obj).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
    return `<table class="report-table"><thead><tr><th>${label}</th><th>Score</th><th>Percent</th><th>Study action</th></tr></thead><tbody>`+
      rows.map(([k,v])=>{ const pct=Math.round(v.correct/v.total*100); return `<tr><td>${escapeHtml(k)}</td><td>${v.correct}/${v.total}</td><td>${pct}%</td><td>${pct<80?'Review and drill this area again.':'Maintain with mixed practice.'}</td></tr>`; }).join('')+'</tbody></table>';
  }
  function showMissedReview(){
    const missedIds = load('missedIds', []);
    const missed = missedIds.map(id => state.questions.find(q=>q.id===id)).filter(Boolean);
    $('homeView').classList.add('hidden'); $('quizView').classList.add('hidden'); $('reportView').classList.add('hidden'); $('reviewView').classList.remove('hidden');
    $('reviewContent').innerHTML = `<h2>Missed Question Review</h2><p>${missed.length ? 'These are saved for extra practice.' : 'No missed questions are saved yet.'}</p>` +
      (missed.length ? `<div class="toolbar"><button class="btn btn-primary" id="drillMissedBtn">Drill 10 missed questions</button><button class="btn btn-secondary" id="clearMissedBtn">Clear missed list</button></div>` : '') +
      missed.slice(0,50).map(q=>`<div class="card"><div class="question-meta"><span class="pill">${escapeHtml(q.id)}</span><span class="pill">D${escapeHtml(q.domain)}</span><span class="pill">${escapeHtml(q.taskId)}</span></div><p><strong>${escapeHtml(q.question)}</strong></p><p class="small">Study: ${escapeHtml(q.studyRedirect||q.topic)}</p></div>`).join('');
    const drillBtn=$('drillMissedBtn'); if(drillBtn) drillBtn.addEventListener('click',()=>{ const pool=missed; state.quiz={mode:'missed',title:'Missed Question Drill',immediate:true,questions:takeRandom(pool,Math.min(10,pool.length)),answers:Array(Math.min(10,pool.length)).fill(null),index:0}; $('reviewView').classList.add('hidden'); $('quizView').classList.remove('hidden'); renderQuestion(); });
    const clearBtn=$('clearMissedBtn'); if(clearBtn) clearBtn.addEventListener('click',()=>{ save('missedIds', []); showMissedReview(); updateDashboard(); });
  }
  function showStudyPlan(){
    const sessions = load('completedSessions', []);
    const missedIds = load('missedIds', []);
    const missed = missedIds.map(id => state.questions.find(q=>q.id===id)).filter(Boolean);
    const dom=countBy(missed, q=>q.domain);
    const task=countBy(missed, q=>q.taskId);
    $('homeView').classList.add('hidden'); $('quizView').classList.add('hidden'); $('reportView').classList.add('hidden'); $('reviewView').classList.remove('hidden');
    $('reviewContent').innerHTML = `<h2>Study Plan</h2>
      <p>This plan uses your saved missed questions and completed sessions.</p>
      <div class="status-row"><span class="pill">Completed sessions: ${sessions.length}</span><span class="pill">Saved missed questions: ${missed.length}</span></div>
      <h3>Priority areas</h3>
      ${missed.length ? `<p><strong>Most missed domains:</strong> ${Object.entries(dom).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`D${escapeHtml(k)} (${v})`).join(', ')}</p>
      <p><strong>Most missed tasks:</strong> ${Object.entries(task).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${escapeHtml(k)} (${v})`).join(', ')}</p>` : '<p>No missed-question pattern yet. Start with a readiness check.</p>'}
      <div class="coach"><strong>Coach Bob:</strong> Start with the area that repeats. Do not wander through the whole book when the report is telling you where the leak is.</div>`;
  }
  function updateMissed(q, isMissed){
    let ids = load('missedIds', []);
    ids = ids.filter(id=>id!==q.id);
    if(isMissed) ids.unshift(q.id);
    save('missedIds', ids.slice(0,300));
  }
  function resetProgress(){
    if(!confirm('Clear saved quiz progress and missed-question list? Settings and agreement status will stay.')) return;
    remove('missedIds'); remove('completedSessions'); remove('lastReport'); toast('Saved progress was cleared.'); updateDashboard(); showHome();
  }
  function exportReport(){
    const report = state.lastReport;
    if(!report){ toast('Complete a quiz or mock exam first.'); return; }
    let txt = `Sleep Pathways Guild RPSGT Practice Report\n${report.title}\nScore: ${report.score}/${report.total} (${report.percent}%)\n\nMissed Questions:\n`;
    report.rows.filter(r=>!r.correct).forEach(r=>{ txt += `\n${r.q.id} | D${r.q.domain} ${r.q.taskId} | ${r.q.topic}\nQuestion: ${r.q.question}\nCorrect: ${LETTERS[r.q.answerIndex]}. ${r.q.options[r.q.answerIndex]}\nRationale: ${r.q.rationale}\nStudy: ${r.q.studyRedirect || r.q.topic}\n`; });
    const blob = new Blob([txt], {type:'text/plain'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='rpsgt-practice-report.txt'; a.click(); URL.revokeObjectURL(url);
  }
  function takeRandom(arr, n){ const copy=arr.slice(); for(let i=copy.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; } return copy.slice(0,n); }
  function countBy(arr, fn){ return arr.reduce((m,x)=>{ const k=fn(x)||'Other'; m[k]=(m[k]||0)+1; return m; },{}); }
  function escapeHtml(s){ return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  document.addEventListener('DOMContentLoaded', init);
})();
