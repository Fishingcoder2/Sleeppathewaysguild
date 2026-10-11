
(function(){
"use strict";
var root="/rpsgt-v3/data/";
var D=["D1","D2","D3","D4"];var N=["Clinical Overview, Education & Patient Support","Sleep Study Preparation & Performance","Scoring, Reporting & Data Verification","Treatment & Intervention"];
var fallbackTasks=[
["D1A","Patient assessment","Understand referral reason, patient symptoms, medication history and relevant clinical risk."],
["D1B","Patient education","Explain study sensors, communication and expectations clearly."],
["D1C","Therapy support","Support mask fitting, adherence and comfort."],
["D2A","Technical preparation","Select montage, calibrated signals and equipment."],
["D2B","Study procedures","Follow standards for hookup, testing and documentation."],
["D2C","Respond and document","Recognize safety threats and quality issues."],
["D3A","Adult scoring","Distinguish stages, arousals, breathing and movement events."],
["D3B","Pediatric and infant scoring","Apply age-appropriate scoring definitions."],
["D3C","Reporting","Verify computed indexes and report accuracy."],
["D4A","PAP therapy","Know CPAP, bilevel and therapeutic protocols."],
["D4B","Alternative therapies","Know non-PAP interventions and indications."],
["D4C","Oxygen therapy","Separate oxygenation, ventilation and obstruction treatment."]
];
var map={},bank={};var active="student",pick=fallbackTasks[0][0],test=null;var KEY="spg-tutor-demo-2026-v2";
function init(){return {requested:false,terms:false,enrolled:false,assigned:false,read:[],passed:{},signoff:{},domain:{},readiness:{},session:false,invoice:false,paid:false,payout:false,d1a:{version:1,step:0,furthest:0,complete:false}}}
var s=init();try{var old=JSON.parse(localStorage.getItem(KEY)||"null");if(old&&typeof old==="object")s=Object.assign(init(),old)}catch(e){}
function store(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
function el(id){return document.getElementById(id)};function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function msg(t){el("feedback").textContent=t;setTimeout(function(){if(el("feedback").textContent===t)el("feedback").textContent=""},9500)}
function tasks(){return fallbackTasks.map(function(x){return {code:x[0],title:(map[x[0]]&&map[x[0]].title)||x[1],focus:(map[x[0]]&&map[x[0]].focus)||x[2],targets:(map[x[0]]&&map[x[0]].studyTargets)||[x[2]]}})}
function pass(code){return !!s.passed[code]};function sign(code){return !!s.signoff[code]}
function idx(code){return fallbackTasks.findIndex(function(x){return x[0]===code})}
function unlocked(code){var n=idx(code);return n===0||(n>0&&sign(fallbackTasks[n-1][0]))}
function domainReady(d){return tasks().filter(function(t){return t.code.slice(0,2)===d}).every(function(t){return sign(t.code)})}
function fullDomains(){return D.every(function(d){return !!s.domain[d]})}
function set(view){if(window.SPGReadAloud)window.SPGReadAloud.stop();active=view;document.querySelectorAll(".view").forEach(function(x){x.hidden=x.id!==view});document.querySelectorAll("[data-view]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.view===view))});render()}
function render(){var done=tasks().filter(function(t){return sign(t.code)}).length;el("overall").textContent=done+" / 12 tasks signed off";el("progressbar").style.width=String(done/12*100)+"%";
el("studentTutor").textContent=s.assigned?"Jordan Lee (fictional)":"Pending assignment";
el("enrollState").textContent=s.enrolled?"Approved":s.requested?"Request filed (simulation)":"Not enrolled";
el("studentRequest").disabled=s.requested;el("studentTerms").disabled=s.terms;
el("approveEnrollment").disabled=!s.requested||!s.terms||s.enrolled;
el("assignTutor").disabled=!s.enrolled||s.assigned;
el("adminEnrollment").textContent="Requested: "+(s.requested?"Yes":"No")+" · Terms acknowledged: "+(s.terms?"Yes":"No")+" · Approved: "+(s.enrolled?"Yes":"No");
el("adminTutor").textContent=s.assigned?"Tutor assigned and ready for tutoring check-ins":"Waiting for enrollment approval";
el("tutorAssignment").textContent=s.assigned?"Assigned; teaching entries and signoffs can be recorded":"Assignment pending administrator authorization";
el("tutorNext").textContent=tasks().filter(function(t){return pass(t.code)&&!sign(t.code)}).map(function(t){return t.code}).join(", ")||"None: student must pass a task check first";
el("tutorTime").textContent="Demonstration instructional minutes: "+(Object.keys(s.signoff).length*15)+" across "+Object.keys(s.signoff).length+" task sign-offs. No charge is created by these entries.";
el("signoffs").innerHTML=tasks().filter(function(t){return sign(t.code)}).map(function(t){return '<span class="tag">'+esc(t.code)+" ✓</span> "}).join("")||'<p class="muted">No sign-offs recorded.</p>';
el("adminSignoffs").innerHTML=tasks().map(function(t){return "<p><strong>"+esc(t.code)+"</strong> "+esc(t.title)+": "+(pass(t.code)?"Quiz passed":"Quiz pending")+"; "+(sign(t.code)?"Tutor signed off (15 demo minutes)":"Tutor signoff pending")+"</p>"}).join("");
el("billingState").textContent="Sample 60-minute session: "+(s.session?"Recorded":"Not recorded")+" · Invoice: "+(s.invoice?"Approved":"Not approved")+" · Collection: "+(s.paid?"Simulated confirmed":"Not recorded");
el("payoutState").textContent=s.payout?"Simulated $45 payout approved; $20 Guild allocation":"No simulated $45 payout approved.";
el("recordSession").disabled=s.session;el("approveBill").disabled=!s.session||s.invoice;el("recordPayment").disabled=!s.invoice||s.paid;el("approvePayout").disabled=!s.paid||s.payout;
renderTaskSelect();renderLesson();renderTutorSelect();renderDomain();renderReadiness()}
var friendlyDomains={D1:"Understanding your patient",D2:"Preparing and performing a sleep study",D3:"Scoring and checking results",D4:"Treatment and support"};
function renderTaskSelect(){var opts=tasks().map(function(t){return '<option value="'+t.code+'" '+(unlocked(t.code)?"":"disabled")+'>'+esc(friendlyDomains[t.code.slice(0,2)]+" · "+t.title+" ("+t.code+")")+(sign(t.code)?" ✓":unlocked(t.code)?"":" 🔒")+"</option>"}).join("");el("taskPick").innerHTML=opts;if(!unlocked(pick))pick=fallbackTasks[0][0];el("taskPick").value=pick}
function d1aProgress(){if(!s.d1a||s.d1a.version!==1)s.d1a={version:1,step:0,furthest:0,complete:false};s.d1a.step=Math.max(0,Math.min(4,Number(s.d1a.step)||0));return s.d1a}
function focusHeading(id){var target=el(id);target.focus();target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
function showLessonStep(n){if(window.SPGReadAloud)window.SPGReadAloud.stop();test=null;el('quizResult').innerHTML='';pick='D1A';var p=d1aProgress();p.step=Math.max(0,Math.min(4,n));p.furthest=Math.max(p.furthest,p.step);store();render();focusHeading('lesson-heading')}
function renderFirstLesson(){
var p=d1aProgress(),step=window.SPGFirstLesson.steps[p.step],last=p.step===4;
el('lesson').innerHTML='<p class="lesson-kicker">Domain 1 — Understanding your patient · Lesson 1 · Step '+(p.step+1)+' of 5</p><h2 id="lesson-heading" tabindex="-1">'+esc(step.title)+'</h2>'+speechToolbar()+'<div id="lesson-reading"><aside class="coach-note"><div class="coach-name"><img src="/assets/coach-bob/coach-bob-avatar.jpg" alt=""><strong>Coach Bob</strong></div><p>'+esc(step.bob)+'</p></aside>'+step.body+'</div>'+(last?'<details><summary>Full references and reading links</summary>'+window.SPGFirstLesson.references+'</details>':'')+(last?'<label class="reading-confirmation"><input id="readingConfirm" type="checkbox" '+(p.complete?'checked':'')+'> I reviewed the lesson and reading plan, and I know which readings to discuss with my tutor.</label><p class="muted">The check uses three existing Guild questions. All three correct meet the 85% Guild target. Tutor approval is still needed to unlock the next task.</p>':'')+'<div class="row lesson-actions">'+(p.step>0?'<button id="lessonBack">Previous step</button>':'')+'<button id="lessonNext" class="primary" '+(last&&(!p.complete||!bank.D1A||bank.D1A.length<3)?'disabled':'')+'>'+(last&&sign('D1A')?'Continue to next lesson':last&&pass('D1A')?'Open sample tutor review':esc(step.next))+'</button></div>'+(last&&!bank.D1A?'<p role="status">Practice questions are unavailable. You can still study this lesson; refresh to try loading practice again.</p>':'');
if(window.SPGReadAloud)window.SPGReadAloud.mount();
}
function speechToolbar(){return '<div id="readAloud" class="speech-tools" aria-label="Read-aloud controls"><div class="row"><button id="speechPlay" type="button">Read aloud</button><button id="speechPause" type="button" disabled>Pause</button><button id="speechStop" type="button" disabled>Stop</button><label for="speechRate">Reading speed</label><select id="speechRate"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></div><p id="speechStatus" role="status" aria-live="polite">Ready to read this lesson step.</p></div>'}
function eligibleTest(){if(!test)return false;if(test.kind==='task')return s.assigned&&unlocked(test.key)&&s.read.indexOf(test.key)>=0&&(test.key!=='D1A'||d1aProgress().complete);if(test.kind==='domain')return domainReady(test.key);var n=Number(test.key);return fullDomains()&&(n===1||s.readiness[n-1])}
function renderLesson(){
if(window.SPGReadAloud)window.SPGReadAloud.stop();
el('lessonCard').hidden=!!test;el('quizCard').hidden=!test;
if(test){renderTest();return}
if(pick==='D1A'){renderFirstLesson();return}
var t=tasks().filter(function(x){return x.code===pick})[0];if(!t)return;
var rd=s.read.indexOf(pick)>=0;
var links={"D1":"<a href='https://www.brpt.org/' target='_blank' rel='noopener'>BRPT handbook</a>; AASM diagnostic/OSA and patient education practice guidance; AAST patient care guidance",
"D2":"AASM scoring manual technical specifications; <a href='https://aastweb.org/' target='_blank' rel='noopener'>AAST PSG technical guidelines</a>; instrumentation, infection control, quality",
"D3":"<a href='https://aasm.org/clinical-resources/scoring-manual/' target='_blank' rel='noopener'>Current AASM Scoring Manual</a>; staging, respiratory scoring, arousals, movements and report verification",
"D4":"<a href='https://aasm.org/clinical-resources/practice-standards/practice-guidelines/' target='_blank' rel='noopener'>AASM PAP/OSA/respiratory guidance</a>; <a href='https://aastweb.org/' target='_blank' rel='noopener'>AAST PAP and titration technical guidance</a>"};
el("lesson").innerHTML='<h2 id="lesson-heading" tabindex="-1" style="margin-top:16px">'+esc(t.code+" · "+t.title)+'</h2><p><strong>Lesson outcome:</strong> '+esc(t.focus)+'</p><p><strong>Before the knowledge check, explain:</strong></p><ul>'+t.targets.slice(0,5).map(function(x){return "<li>"+esc(x)+"</li>"}).join("")+'</ul><p><strong>Required:</strong> <em>Fundamentals of Sleep Technology</em> (match the topic in your edition); current AASM Scoring Manual; applicable <a href="https://aasm.org/clinical-resources/practice-standards/practice-guidelines/" target="_blank" rel="noopener">AASM practice guidelines</a>; '+links[t.code.slice(0,2)]+'</p><p><strong>Highly recommended:</strong> AAST technical guidelines, Marie Sosa books (verify title/edition), BRPT reference list, Guild original lessons and textbook review.</p><p class="muted">Exact chapter numbers need checking against the learner’s textbook edition and the Guild reference workbook. No copyrighted textbook is reproduced.</p><div class="row"><button type="button" id="markRead" '+(!s.assigned||pass(pick)?"disabled":"")+'>'+(rd?"Start practice check":"Mark study targets reviewed")+'</button><span class="pill">'+(pass(pick)?"Task quiz passed":rd?"Ready for quiz":"Reading not yet reviewed")+'</span><span class="pill">'+(sign(pick)?"Tutor approved":"Tutor approval required")+'</span></div>';
if(test&&test.kind!=="task")return;
el("quiznotice").textContent="Task "+pick+" • 3 screened Guild questions • Pass threshold 85% (3 correct out of 3). "+(!s.assigned?"Complete onboarding and tutor matching first.":!rd?"Review the teaching targets and mark them complete before answering.":"Take the quiz, then have your assigned tutor approve the task.");
if(!test||test.key!==pick){el("quiz").innerHTML="";el("quizResult").innerHTML=""}
el("quizSubmit").disabled=!s.assigned||!rd||!bank[pick]||bank[pick].length<3||pass(pick);
el("quizRetry").disabled=!s.assigned||!rd||!bank[pick]||bank[pick].length<3;
if(pass(pick))el("quizResult").innerHTML='<div class="answer"><strong>Task knowledge check passed.</strong> Await tutor sign-off to unlock the next task.</div>'}
function renderTutorSelect(){var options=tasks().filter(function(t){return pass(t.code)&&!sign(t.code)});el("signoffTask").innerHTML=options.map(function(t){return '<option value="'+esc(t.code)+'">'+esc(t.code+" — "+t.title)+"</option>"}).join("")||'<option value="">No pending approvals</option>';el("signoffButton").disabled=!s.assigned||!options.length}
function renderDomain(){var html="";D.forEach(function(d,i){html+='<div class="status"><strong>'+d+": "+esc(N[i])+"</strong> · "+(s.domain[d]?"Passed ✓":domainReady(d)?"Ready":"Locked until all 3 task sign-offs")+'<div class="row" style="margin-top:8px"><button type="button" data-domain="'+d+'" '+(!domainReady(d)||s.domain[d]||!bank[d]?"disabled":"")+'>'+(s.domain[d]?"Passed":"Start 9-question domain exam")+"</button></div></div>"});el("domainPanel").innerHTML=html}
function renderReadiness(){var html="";for(var i=1;i<=4;i++){var ready=fullDomains()&&(i===1||s.readiness[i-1]);html+='<div class="status"><strong>Readiness preview '+i+'</strong> · '+(s.readiness[i]?"Passed ✓":ready?"Available":"Locked")+'<div class="row" style="margin-top:8px"><button type="button" data-ready="'+i+'" '+(!ready||s.readiness[i]?"disabled":"")+'>'+(s.readiness[i]?"Passed":"Take 12-question readiness preview")+"</button></div></div>"}el("readinessPanel").innerHTML=html}
function startTest(kind,key,list){
if(kind==='task'&&(!s.assigned||!unlocked(key)||s.read.indexOf(key)<0||(key==='D1A'&&!d1aProgress().complete))){msg('Study the lesson and reading plan before starting practice.');return}
if(window.SPGReadAloud)window.SPGReadAloud.stop();
if(kind!=="readiness"&&(!list||!list.length)){msg("The screened question set has not loaded. Please refresh.");return}var chosen=list.slice();if(kind==="readiness"){chosen=[];D.forEach(function(d,i){var a=(bank[d]||[]).slice();for(var j=0;j<3&&a.length;j++)chosen.push(a[(j+(Number(key)-1)*2)%a.length])})}test={kind:kind,key:key,questions:chosen.map(function(q){return q}),answers:{},done:false};el('lessonCard').hidden=true;el('quizCard').hidden=false;renderTest();focusHeading('quiztitle')}
function continueAfterPractice(code){if(sign(code)){var next=fallbackTasks[idx(code)+1];if(next){pick=next[0];test=null;el('quizResult').innerHTML='';set('student');focusHeading('lesson-heading');return}msg('All task lessons are approved. Open your course to review domain exams.');return}set('tutor');focusHeading('tutorReviewHeading')}
function renderTest(){if(!test){el("quiz").innerHTML="";return}el("quiztitle").textContent=test.kind==="task"?"Check your understanding: "+test.key:test.kind==="domain"?"Domain "+test.key+" exam":"Readiness preview "+test.key;
el("quiznotice").textContent=test.questions.length+" existing Guild questions • 85% Guild learning target, not a BRPT passing score • "+(test.kind==="task"?"3 of 3":test.kind==="domain"?"8 of 9":"11 of 12")+" correct.";
el("quiz").innerHTML=test.questions.map(function(q,i){return '<div class="status"><fieldset class="quiz-question"><legend>'+(i+1)+'. '+esc(q.prompt)+'</legend>'+q.options.map(function(a,j){return '<label style="font-weight:500;margin:8px 0"><input style="width:auto" type="radio" name="item-'+i+'" value="'+j+'" '+(String(test.answers[i])===String(j)?"checked":"")+' '+(test.done?"disabled":"")+'> '+esc(a)+'</label>'}).join("")+'</fieldset></div>'}).join("");
el("quizSubmit").disabled=test.done||!eligibleTest();el("quizSubmit").textContent="Check my understanding";el("quizRetry").disabled=!test.done||(test.kind==='task'&&pass(test.key));el('quizRetry').textContent=test.kind==='task'&&test.key==='D1A'?'Review lesson before retry':'Study and retry';el('returnLesson').hidden=test.kind!=='task'||(test.done&&pass(test.key));el('quizSubmit').hidden=test.done;el('quizRetry').hidden=!test.done||(test.kind==='task'&&pass(test.key));el('quizTutorReview').hidden=!(test.done&&test.kind==='task'&&pass(test.key));el('quizTutorReview').textContent=sign(test.key)?'Continue to next lesson':'Open sample tutor review';if(test.kind==='task'&&test.done&&sign(test.key)&&el('quizOutcome'))el('quizOutcome').textContent='Practice passed — tutor approved. You can continue to the next lesson.' }
function grade(){if(!test||test.done||!eligibleTest()){msg("Start or reset a check first.");return}
var empty=false;test.questions.forEach(function(q,i){var checked=document.querySelector('input[name="item-'+i+'"]:checked');if(checked)test.answers[i]=Number(checked.value);else empty=true});
if(empty){msg("Answer every question before submitting.");return}
var correct=0;test.questions.forEach(function(q,i){if(q.options[test.answers[i]]===q.answer)correct++});
var score=Math.round(correct/test.questions.length*100),passed=score>=85;
test.done=true;var repairs=[];var details=test.questions.map(function(q,i){var good=q.options[test.answers[i]]===q.answer;var repair=window.SPGFirstLesson.remediation[q.id];if(!good&&test.kind==='task'&&test.key==='D1A'&&repair)repairs.push('<li>'+esc(repair.text)+' <button type="button" data-lesson-step="'+repair.step+'">Revisit this explanation</button></li>');return '<p><strong>Q'+(i+1)+" "+(good?"✓ Correct":"✗ Review")+"</strong> — "+esc(q.topic||q.task||"Task")+'<br><strong>Best answer:</strong> '+esc(q.answer)+'<br><strong>Why:</strong> '+esc(q.rationale||"Review the assigned primary source.")+"</p>"}).join("");
el("quizResult").innerHTML='<div class="answer"><strong id="quizOutcome">'+score+'% ('+correct+'/'+test.questions.length+") — "+(passed?"Ready for tutor review":"Let’s review together")+'</strong><p>'+(passed?"You met the Guild study threshold.":"Coach Bob: A missed answer tells us what to work on. Read the explanation, study the suggested section, and talk it through with your tutor before another try.")+"</p>"+(repairs.length?"<ul>"+repairs.join("")+"</ul>":"")+"<details><summary>Review each answer and why it fits</summary>"+details+"</details></div>";
if(passed){if(test.kind==="task"){s.passed[test.key]=true;msg("Task check passed. Tutor sign-off is still required before advancing.");}if(test.kind==="domain"){s.domain[test.key]=true;msg("Domain exam passed.");}if(test.kind==="readiness"){s.readiness[test.key]=true;msg("Readiness preview "+test.key+" passed.");}}
store();renderTest();render();focusHeading('quizResult')}
function action(fn){fn();store();render()}
document.querySelectorAll("[data-view]").forEach(function(b){b.addEventListener("click",function(){set(b.dataset.view)})});
el("reset").onclick=function(){if(confirm("Clear this browser's fictional tutoring demo progress?")){s=init();test=null;pick="D1A";store();render();msg("Demo reset.")}};
el("studentRequest").onclick=function(){action(function(){s.requested=true});msg("Fictional enrollment request submitted for admin review.")};
el("studentTerms").onclick=function(){action(function(){s.terms=true});msg("Sample terms acknowledged. This is not an electronic signature.")};
el("approveEnrollment").onclick=function(){if(!s.requested||!s.terms)return;action(function(){s.enrolled=true});msg("Fictional enrollment approved.")};
el("assignTutor").onclick=function(){if(!s.enrolled)return;action(function(){s.assigned=true});msg("Fictional tutor assigned. Student can begin learning.")};
el("taskPick").onchange=function(e){if(window.SPGReadAloud)window.SPGReadAloud.stop();pick=e.target.value;test=null;el("quizResult").innerHTML="";render()};
document.addEventListener("change",function(e){if(e.target.id==='readingConfirm'){d1aProgress().complete=e.target.checked;store();el('lessonNext').disabled=!e.target.checked||!bank.D1A||bank.D1A.length<3}if(test&&!test.done&&e.target.type==='radio'&&/^item-\d+$/.test(e.target.name)){test.answers[Number(e.target.name.slice(5))]=Number(e.target.value)}});
document.addEventListener("click",function(e){
if(e.target.id==='lessonBack'){showLessonStep(d1aProgress().step-1);return}
if(e.target.id==='lessonNext'){var p=d1aProgress();if(p.step<4){showLessonStep(p.step+1);return}if(!p.complete||!bank.D1A||bank.D1A.length<3)return;
if(pass('D1A')){continueAfterPractice('D1A');return}
if(!s.assigned){s.requested=true;s.terms=true;s.enrolled=true;s.assigned=true;msg('Alex Morgan and Jordan Lee are ready for sample practice. No real enrollment or agreement was created.')}
if(s.read.indexOf('D1A')<0)s.read.push('D1A');store();startTest('task','D1A',bank.D1A);return}
if(e.target.hasAttribute('data-lesson-step')){d1aProgress().complete=false;showLessonStep(Number(e.target.dataset.lessonStep));return}
if(e.target.id==="markRead"){if(!s.assigned||!unlocked(pick)||pass(pick))return;var alreadyRead=s.read.indexOf(pick)>=0;if(alreadyRead){if(bank[pick]&&bank[pick].length>=3)startTest('task',pick,bank[pick]);else msg('Practice questions are unavailable. Refresh to try loading them again.')}else{action(function(){s.read.push(pick)});msg('Study checklist reviewed. Start practice when you are ready.')}return}
if(e.target.dataset.domain){var d=e.target.dataset.domain;if(domainReady(d)&&bank[d]){set("student");startTest("domain",d,bank[d]);}return}
if(e.target.dataset.ready){var n=Number(e.target.dataset.ready);if(fullDomains()&&(n===1||s.readiness[n-1])){set("student");startTest("readiness",n,[])}return}});
el("quizSubmit").onclick=grade;
el('quizTutorReview').onclick=function(){if(test&&test.kind==='task'&&pass(test.key))continueAfterPractice(test.key)};
el('returnLesson').onclick=function(){if(test&&test.kind==='task'){if(test.key==='D1A'){showLessonStep(d1aProgress().step)}else{test=null;render()}}};
el("quizRetry").onclick=function(){if(!test||!test.done||(test.kind==='task'&&pass(test.key)))return;if(test.kind==='task'&&test.key==='D1A'){var missed=test.questions.find(function(q,i){return q.options[test.answers[i]]!==q.answer});var repair=missed&&window.SPGFirstLesson.remediation[missed.id];d1aProgress().complete=false;showLessonStep(repair?repair.step:0);return}if(!eligibleTest())return;test.done=false;test.answers={};el("quizResult").innerHTML="";renderTest();focusHeading('quiztitle')};
el("signoffButton").onclick=function(){var code=el("signoffTask").value;if(!code||!pass(code)||sign(code)||!s.assigned)return;var note=el("instructionNote").value.trim();if(note.length<12){msg("Write a brief teaching summary of at least 12 characters before signing off.");return}action(function(){s.signoff[code]={minutes:15,note:note.slice(0,400),at:new Date().toISOString()}});el("instructionNote").value="";msg(code+" signed off in fictional tutor view. Next student task unlocked.")};
el("recordSession").onclick=function(){action(function(){s.session=true});msg("Fictional completed appointment logged.")};
el("approveBill").onclick=function(){if(!s.session)return;action(function(){s.invoice=true});msg("Fictional $65 invoice approved. No email was sent.")};
el("recordPayment").onclick=function(){if(!s.invoice)return;action(function(){s.paid=true});msg("Simulated $65 collection recorded. No payment occurred.")};
el("approvePayout").onclick=function(){if(!s.paid)return;action(function(){s.payout=true});msg("Simulated $45 payout approved. No money moved.")};
function load(){Promise.all([fetch(root+"blueprint.json").then(function(r){if(!r.ok)throw Error("blueprint");return r.json()}),Promise.all(D.map(function(d){return fetch(root+"practice-slice/"+d.toLowerCase()+".json").then(function(r){if(!r.ok)throw Error(d);return r.json()})}))]).then(function(all){
all[0].domains.forEach(function(d){d.tasks.forEach(function(t){map[t.code]=t})});
all[1].forEach(function(v,i){bank[D[i]]=v.questions.filter(function(q){return q&&q.prompt&&q.answer&&Array.isArray(q.options)&&q.options.indexOf(q.answer)>=0});v.questions.forEach(function(q){if(!bank[q.taskCode])bank[q.taskCode]=[];bank[q.taskCode].push(q)})});
renderTaskSelect();renderDomain();renderReadiness();if(pick==='D1A'&&d1aProgress().step===4&&!test)renderLesson();}).catch(function(e){render();msg("Study materials could not load. Use the Guild app links, or refresh. No quiz result can be submitted until loaded.")})}
render();load();
})();
