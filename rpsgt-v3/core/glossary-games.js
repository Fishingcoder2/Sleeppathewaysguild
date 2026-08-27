(function(){
  'use strict';
  const root=document.querySelector('[data-glossary-games]');
  const libraryApi=window.RPSGTV2FlashcardLibrary;
  const storage=window.RPSGTStorage;
  const memoryApi=window.RPSGTMemoryGames;
  if(!root||!libraryApi||!storage||!memoryApi) return;

  let terms=[];
  let mode='match';
  let category='all';
  let pairCount=6;
  let matchState=null;
  let recallState=null;
  let weakTurn=0;
  let learner=storage.load();

  const categorySelect=root.querySelector('[data-glossary-category]');
  const panel=root.querySelector('[data-glossary-panel]');
  const countNode=root.querySelector('[data-glossary-count]');
  const descriptionNode=root.querySelector('[data-glossary-description]');
  const sourceSummaryNode=root.querySelector('[data-glossary-source-summary]');

  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function shuffle(values){const copy=values.slice();for(let i=copy.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  function sampleFrom(values,count){return shuffle(values).slice(0,Math.min(count,values.length));}
  function short(value,max){const text=String(value||'');return text.length>max?text.slice(0,max-1).trim()+'…':text;}
  function unique(values){return Array.from(new Set((Array.isArray(values)?values:[]).map(value=>String(value||'').trim()).filter(Boolean)));}
  function filtered(){return terms.filter(term=>category==='all'||term.category===category);}

  function stats(){
    learner.labs=learner.labs&&typeof learner.labs==='object'?learner.labs:{};
    learner.labs.memoryGames=learner.labs.memoryGames&&typeof learner.labs.memoryGames==='object'?learner.labs.memoryGames:{};
    const s=learner.labs.memoryGames;
    s.glossaryAnswered=Number(s.glossaryAnswered||0);
    s.glossaryCorrect=Number(s.glossaryCorrect||0);
    s.glossaryStreak=Number(s.glossaryStreak||0);
    s.bestGlossaryStreak=Number(s.bestGlossaryStreak||0);
    s.glossaryMatches=Number(s.glossaryMatches||0);
    s.cardMemory=s.cardMemory&&typeof s.cardMemory==='object'?s.cardMemory:{};
    return s;
  }
  function save(){learner=storage.save(learner);}
  function memoryRecord(cardId){
    const prior=stats().cardMemory[String(cardId)]||{};
    return {attempts:Number(prior.attempts||0),correct:Number(prior.correct||0),misses:Number(prior.misses||0),streak:Number(prior.streak||0),lastSeen:prior.lastSeen||null,lastResult:prior.lastResult||null};
  }
  function weakness(cardId){
    const record=memoryRecord(cardId);
    if(!record.attempts||!record.misses) return -1;
    return (record.misses/record.attempts)*100+record.misses*8-Math.min(record.streak,5)*3;
  }
  function weakTerms(){return filtered().filter(term=>weakness(term.id)>=0).sort((a,b)=>weakness(b.id)-weakness(a.id));}
  function recordRecall(cardId,correct){
    learner=storage.load();
    const s=stats();
    const record=memoryRecord(cardId);
    record.attempts+=1;record.lastSeen=new Date().toISOString();record.lastResult=correct?'correct':'incorrect';
    if(correct){record.correct+=1;record.streak+=1;s.glossaryCorrect+=1;s.glossaryStreak+=1;}
    else{record.misses+=1;record.streak=0;s.glossaryStreak=0;}
    s.glossaryAnswered+=1;
    s.bestGlossaryStreak=Math.max(s.bestGlossaryStreak,s.glossaryStreak);
    s.cardMemory[String(cardId)]=record;
    save();
    const sound=correct&&s.glossaryStreak>0&&s.glossaryStreak%5===0?'streak':correct?'correct':'incorrect';
    memoryApi.play(sound);
    renderStats();
    return record;
  }
  function renderStats(){
    learner=storage.load();const s=stats();
    const accuracy=s.glossaryAnswered?Math.round(s.glossaryCorrect/s.glossaryAnswered*100):0;
    const weak=terms.filter(term=>weakness(term.id)>=0).length;
    const values={
      '[data-glossary-stat-accuracy]':accuracy+'%',
      '[data-glossary-stat-streak]':String(s.glossaryStreak),
      '[data-glossary-stat-best]':String(s.bestGlossaryStreak),
      '[data-glossary-stat-weak]':String(weak)
    };
    Object.entries(values).forEach(([selector,value])=>{const node=root.querySelector(selector);if(node)node.textContent=value;});
    if(countNode)countNode.textContent=terms.length.toLocaleString()+' glossary terms';
  }

  function setMode(next){
    mode=next;matchState=null;recallState=null;
    root.querySelectorAll('[data-glossary-mode]').forEach(button=>button.classList.toggle('active',button.dataset.glossaryMode===mode));
    const descriptions={
      match:'Match each RPSGT term with its Sleep Pathways Guild definition.',
      forward:'See the term and retrieve the correct definition.',
      reverse:'See the definition and retrieve the correct term.',
      weak:'Revisit glossary terms you have missed, alternating both retrieval directions.'
    };
    if(descriptionNode)descriptionNode.textContent=descriptions[mode]||descriptions.forward;
    startCurrent();
  }

  function startMatch(){
    const chosen=sampleFrom(filtered(),pairCount);
    if(chosen.length<2){showEmpty('Choose a glossary category with at least two terms.');return;}
    const deck=[];
    chosen.forEach(term=>{
      deck.push({key:term.id+':term',pairId:term.id,label:term.front,side:'term'});
      deck.push({key:term.id+':definition',pairId:term.id,label:term.back,side:'definition'});
    });
    matchState={deck:shuffle(deck),selected:[],matched:new Set(),moves:0,locked:false,pairs:chosen.length};
    renderMatch();
  }
  function renderMatch(){
    if(!matchState){startMatch();return;}
    panel.innerHTML='<div class="glossary-panel-head"><span class="status">Glossary Match</span><strong data-glossary-match-progress>'+matchState.matched.size+' / '+matchState.pairs+' pairs · '+matchState.moves+' moves</strong></div><div class="glossary-match-board" data-glossary-match-board></div><div class="glossary-feedback" data-glossary-feedback hidden></div>';
    const board=panel.querySelector('[data-glossary-match-board]');
    matchState.deck.forEach(item=>{
      const button=document.createElement('button');button.type='button';button.className='glossary-tile';button.dataset.glossaryTile=item.key;
      const shown=matchState.selected.includes(item.key)||matchState.matched.has(item.pairId);
      if(shown)button.classList.add('revealed');if(matchState.matched.has(item.pairId))button.classList.add('matched');
      button.disabled=matchState.matched.has(item.pairId);button.setAttribute('aria-label',shown?item.label:'Hidden glossary card');
      button.innerHTML=shown?'<span class="glossary-tile-type">'+(item.side==='term'?'TERM':'DEFINITION')+'</span><span>'+escapeHtml(short(item.label,180))+'</span>':'<span class="glossary-tile-hidden">SPG</span>';
      button.addEventListener('click',()=>chooseMatch(item.key));board.appendChild(button);
    });
  }
  function chooseMatch(key){
    if(!matchState||matchState.locked||matchState.selected.includes(key))return;
    const item=matchState.deck.find(row=>row.key===key);if(!item||matchState.matched.has(item.pairId))return;
    matchState.selected.push(key);memoryApi.play('click');renderMatch();if(matchState.selected.length<2)return;
    matchState.moves+=1;
    const first=matchState.deck.find(row=>row.key===matchState.selected[0]);const second=matchState.deck.find(row=>row.key===matchState.selected[1]);
    if(first&&second&&first.pairId===second.pairId&&first.side!==second.side){
      matchState.matched.add(first.pairId);matchState.selected=[];memoryApi.play('correct');
      if(matchState.matched.size===matchState.pairs){learner=storage.load();stats().glossaryMatches+=1;save();memoryApi.play('badge');}
      renderMatch();
      if(matchState.matched.size===matchState.pairs){const feedback=panel.querySelector('[data-glossary-feedback]');feedback.hidden=false;feedback.className='glossary-feedback correct';feedback.textContent='Glossary round complete — '+matchState.pairs+' pairs in '+matchState.moves+' moves.';}
      return;
    }
    matchState.locked=true;memoryApi.play('incorrect');renderMatch();window.setTimeout(()=>{matchState.selected=[];matchState.locked=false;renderMatch();},700);
  }

  function recallPool(){return mode==='weak'?weakTerms():filtered();}
  function recallDirection(){if(mode==='reverse')return'reverse';if(mode==='forward')return'forward';const next=weakTurn%2?'reverse':'forward';weakTurn+=1;return next;}
  function startRecall(){
    const pool=recallPool();
    if(mode==='weak'&&!pool.length){showEmpty('No weak glossary terms yet. Use Term → Definition or Definition → Term; missed terms will enter this repair deck automatically.');return;}
    if(pool.length<1){showEmpty('No glossary terms are available for this category.');return;}
    const question=sampleFrom(pool,1)[0];
    let distractorPool=filtered().filter(term=>term.id!==question.id);
    if(distractorPool.length<3)distractorPool=terms.filter(term=>term.id!==question.id);
    if(distractorPool.length<3){showEmpty('Choose a glossary category with at least four terms.');return;}
    const direction=recallDirection();const choices=shuffle([question,...sampleFrom(distractorPool,3)]);
    recallState={question,choices,direction,answered:false};renderRecall();
  }
  function renderRecall(){
    const question=recallState.question;const reverse=recallState.direction==='reverse';
    panel.innerHTML='<div class="glossary-recall"><div class="glossary-panel-head"><span class="status '+(mode==='weak'?'gold':'')+'">'+(mode==='weak'?'Weak Glossary':reverse?'Definition → Term':'Term → Definition')+'</span><span>'+escapeHtml(question.category)+'</span></div><div class="glossary-recall-prompt"><strong>'+escapeHtml(reverse?question.back:question.front)+'</strong></div><div class="glossary-choice-grid" data-glossary-choices></div><div class="glossary-feedback" data-glossary-feedback hidden></div><div class="glossary-reference-list" data-glossary-references hidden></div><div class="actions"><button class="btn primary" type="button" data-glossary-next hidden>Next term</button></div></div>';
    const choices=panel.querySelector('[data-glossary-choices]');
    recallState.choices.forEach(term=>{const button=document.createElement('button');button.type='button';button.className='recall-choice';button.dataset.glossaryChoice=term.id;button.textContent=reverse?term.front:term.back;button.addEventListener('click',()=>answerRecall(term.id));choices.appendChild(button);});
    panel.querySelector('[data-glossary-next]')?.addEventListener('click',startRecall);
  }
  function renderReferences(term){
    const host=panel.querySelector('[data-glossary-references]');if(!host)return;
    const refs=unique(term.references||[]);if(!refs.length){host.hidden=true;return;}
    host.hidden=false;host.innerHTML='<strong>References</strong><ul>'+refs.map(ref=>'<li>'+escapeHtml(ref)+'</li>').join('')+'</ul>';
  }
  function answerRecall(id){
    if(!recallState||recallState.answered)return;recallState.answered=true;
    const correct=id===recallState.question.id;const record=recordRecall(recallState.question.id,correct);
    panel.querySelectorAll('[data-glossary-choice]').forEach(button=>{button.disabled=true;if(button.dataset.glossaryChoice===recallState.question.id)button.classList.add('correct');else if(button.dataset.glossaryChoice===id)button.classList.add('incorrect');});
    const feedback=panel.querySelector('[data-glossary-feedback]');feedback.hidden=false;feedback.className='glossary-feedback '+(correct?'correct':'incorrect');
    const clue=recallState.question.memoryClue?' Memory clue: '+recallState.question.memoryClue:'';
    const repair=mode==='weak'?' Weak Memory: '+record.misses+' miss'+(record.misses===1?'':'es')+', current streak '+record.streak+'.':'';
    feedback.textContent=(correct?'Correct.':'Review: '+recallState.question.front+' — '+recallState.question.back)+clue+repair;
    renderReferences(recallState.question);
    panel.querySelector('[data-glossary-next]').hidden=false;
  }

  function showEmpty(message){panel.innerHTML='<div class="glossary-welcome"><span class="status gold">Terminology Glossary</span><h3>Build retrieval one term at a time.</h3><p>'+escapeHtml(message)+'</p></div>';}
  function startCurrent(){memoryApi.play('click');if(mode==='match')startMatch();else startRecall();}
  function looksLikeQuestion(front){return /\?$/.test(front)||/^(what|which|how|when|why|who|calculate|select|identify|choose)\b/i.test(front);}
  function canonicalTerm(value){
    return String(value||'').toLowerCase().replace(/rem-without\s+atonia/g,'rem sleep without atonia').replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  }
  function termVariants(value){
    const text=String(value||'').trim();const variants=[canonicalTerm(text)];
    for(const match of text.matchAll(/\(([^)]+)\)/g)){const token=canonicalTerm(match[1]);if(token&&token.length<=16)variants.push(token);}
    if(text.includes(','))variants.push(canonicalTerm(text.split(',')[0]));
    return unique(variants);
  }
  function legacyTerms(payload,config){
    const included=new Set(config.includeCategories||[]);const max=Number(config.maxFrontLength||90);const min=Number(config.minimumDefinitionLength||12);
    return (payload.cards||[]).filter(card=>included.has(card.category)).filter(card=>String(card.front||'').trim().length<=max).filter(card=>String(card.back||'').trim().length>=min).filter(card=>!config.excludeQuestionFronts||!looksLikeQuestion(String(card.front||'').trim())).map(card=>({
      id:card.id,
      front:String(card.front).trim(),
      back:String(card.back).trim(),
      category:card.category,
      memoryClue:card.memoryClue||'',
      references:typeof libraryApi.referencesForCategory==='function'?libraryApi.referencesForCategory(card.category):[],
      authority:false
    }));
  }
  function authorityTerms(payloads){
    return payloads.flatMap(payload=>(Array.isArray(payload.items)?payload.items:[]).map(item=>({
      id:item.id,
      front:String(item.term||'').trim(),
      back:String(item.definition||'').trim(),
      category:String(item.category||'RPSGT terminology').trim(),
      memoryClue:item.memoryClue||'',
      references:unique(item.references||[payload.apaReference]),
      authority:true
    }))).filter(term=>term.id&&term.front&&term.back);
  }
  function mergeTerms(legacy,authority){
    const merged=legacy.map(term=>Object.assign({},term));
    const variantToIndex=new Map();
    merged.forEach((term,index)=>termVariants(term.front).forEach(key=>{if(key&&!variantToIndex.has(key))variantToIndex.set(key,index);}));
    authority.forEach(term=>{
      const keys=termVariants(term.front);let index=-1;
      for(const key of keys){if(variantToIndex.has(key)){index=variantToIndex.get(key);break;}}
      if(index>=0){
        const prior=merged[index];
        merged[index]=Object.assign({},term,{id:prior.id,legacyId:prior.id,authorityId:term.id,references:unique([...(term.references||[]),...(prior.references||[])])});
        termVariants(merged[index].front).forEach(key=>{if(key)variantToIndex.set(key,index);});
      }else{
        const nextIndex=merged.length;merged.push(Object.assign({},term));
        termVariants(term.front).forEach(key=>{if(key&&!variantToIndex.has(key))variantToIndex.set(key,nextIndex);});
      }
    });
    return merged;
  }
  async function loadJson(path){const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(path+' HTTP '+response.status);return response.json();}

  root.querySelectorAll('[data-glossary-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.glossaryMode)));
  root.querySelectorAll('[data-glossary-size]').forEach(button=>button.addEventListener('click',()=>{pairCount=Number(button.dataset.glossarySize)||6;root.querySelectorAll('[data-glossary-size]').forEach(item=>item.classList.toggle('active',item===button));if(mode==='match')startMatch();}));
  root.querySelector('[data-glossary-start]')?.addEventListener('click',startCurrent);
  categorySelect?.addEventListener('change',()=>{category=categorySelect.value;startCurrent();});

  async function init(){
    try{
      const [payload,config,manifest]=await Promise.all([libraryApi.load(),loadJson('data/memory/spg-glossary-config.json'),loadJson('data/terminology/manifest.json')]);
      const authorityPayloads=await Promise.all((manifest.learnerFiles||[]).map(file=>loadJson('data/terminology/'+file)));
      const legacy=legacyTerms(payload,config);const authority=authorityTerms(authorityPayloads);terms=mergeTerms(legacy,authority);
      const categories=['all',...Array.from(new Set(terms.map(term=>term.category))).sort((a,b)=>a.localeCompare(b))];
      categorySelect.replaceChildren(...categories.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value==='all'?'All glossary categories':value;return option;}));
      if(sourceSummaryNode){const audit=manifest.auditSummary||{};sourceSummaryNode.textContent=Number(audit.uniqueTermsAcrossThreeInventories||0).toLocaleString()+' source terms inventoried · '+Number(audit.studyReadyAuthorityAdditions||authority.length).toLocaleString()+' authority-based SPG additions';}
      renderStats();setMode(mode);
    }catch(error){showEmpty('Glossary could not load: '+error.message);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
