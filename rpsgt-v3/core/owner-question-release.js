(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTOwnerQuestionRelease=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const RELEASE_ID='spg-owner-question-release-2026-10-11';
  const RELEASE_PATH='data/owner-approved-question-release.json';
  const DISPATCH_PATH='data/owner-question-dispatch.json';
  const DIRECT_TASKS=['D1A','D1B','D1C','D2A','D2B','D2C','D3A','D3B','D3C','D4A','D4B','D4C'];
  const clone=value=>JSON.parse(JSON.stringify(value));
  let releasePromise=null;

  function validateRelease(release){
    if(!release||release.releaseId!==RELEASE_ID||!Array.isArray(release.questions)) throw new Error('The owner-approved question release is invalid.');
    const ids=new Set();
    release.questions.forEach(question=>{
      if(!question||!String(question.id||'').trim()||ids.has(String(question.id))) throw new Error('The owner-approved question release has a duplicate or missing ID.');
      ids.add(String(question.id));
      if(question.ownerReleaseApproved!==true||!DIRECT_TASKS.includes(question.taskCode)||question.domain!==question.taskCode.slice(0,2)||!Array.isArray(question.options)||!question.options.includes(question.answer)||!String(question.prompt||'').trim()||!String(question.rationale||'').trim()||!Array.isArray(question.referenceKeys)||!question.referenceKeys.length||!Array.isArray(question.studyRecommendationKeys)||!question.studyRecommendationKeys.length) throw new Error('An owner-approved question is incomplete: '+question.id);
      if((question.qa&&question.qa.manualReviewRecommended)||question.qa?.learnerExcluded===true||question.publicationStatus==='proposed-not-learner-eligible') throw new Error('An owner-approved addition has not been released for learner practice: '+question.id);
    });
    if(release.questions.length!==Number(release.rpsgtAddedCount)) throw new Error('The owner-approved addition count does not match its questions.');
    return release;
  }

  function releaseMetadata(release,baseCount){
    return {releaseId:release.releaseId,ownerReleaseApproved:true,baseQuestionCount:baseCount,addedQuestionCount:release.questions.length,programCounts:clone(release.programCounts),sourceRecordsPreserved:true};
  }
  function additionsForTask(release,code){return release.questions.filter(question=>question.taskCode===code);}
  function decorateModule(data,release){
    if(data.ownerQuestionRelease&&data.ownerQuestionRelease.releaseId===release.releaseId) return data;
    const code=data.meta&&data.meta.taskCode;
    const additions=additionsForTask(release,code);
    if(!additions.length) return data;
    const ids=new Set((data.questions||[]).map(question=>String(question.id)));
    if(additions.some(question=>ids.has(String(question.id)))) throw new Error('An approved addition would replace a source record in '+code+'.');
    return {...data,meta:{...data.meta,sourceQuestionCount:data.questions.length,questionCount:data.questions.length+additions.length},questions:data.questions.concat(clone(additions)),ownerQuestionRelease:releaseMetadata(release,data.questions.length),ownerReleaseQuestionIds:additions.map(question=>question.id)};
  }
  function decorateManifest(data,release){
    if(data.ownerQuestionRelease&&data.ownerQuestionRelease.releaseId===release.releaseId) return data;
    const count=release.questions.length;
    const source=data.integritySummary;
    // Source hashes and editorial metrics describe the immutable extracted modules.
    // The effective summary contains only counts established for the combined pool.
    const integritySummary={uniqueExactIds:Number(source.uniqueExactIds)+count,uniqueStringifiedIds:Number(source.uniqueStringifiedIds)+count,numericIdCount:Number(source.numericIdCount)+release.questions.filter(question=>typeof question.id==='number').length,stringIdCount:Number(source.stringIdCount)+release.questions.filter(question=>typeof question.id==='string').length,answerInOptionsCount:Number(source.answerInOptionsCount)+count,invalidAnswerCount:source.invalidAnswerCount,missingReferenceKeysCount:source.missingReferenceKeysCount,missingStudyRecommendationKeysCount:source.missingStudyRecommendationKeysCount,manualReviewRecommendedCount:source.manualReviewRecommendedCount,crossTaskRecordCount:source.crossTaskRecordCount};
    return {...data,meta:{...data.meta,sourceQuestionCount:data.meta.questionCount,questionCount:Number(data.meta.questionCount)+count,hashScope:'Original extracted source records; approved overlay is recorded separately'},modules:data.modules.map(entry=>({...entry,sourceQuestionCount:entry.questionCount,questionCount:Number(entry.questionCount)+additionsForTask(release,entry.taskCode).length})),sourceIntegritySummary:{...source},integritySummary,ownerQuestionRelease:releaseMetadata(release,data.meta.questionCount)};
  }
  function compactRecord(question){
    return {id:question.id,domain:question.domain,taskCode:question.taskCode,topic:question.topic,referenceKeys:(question.referenceKeys||[]).slice(),studyRecommendationKeys:(question.studyRecommendationKeys||[]).slice(),manualReviewRecommended:false};
  }
  function decorateFeedback(data,release){
    if(data.ownerQuestionRelease&&data.ownerQuestionRelease.releaseId===release.releaseId) return data;
    const ids=new Set((data.records||[]).map(record=>String(record.id)));
    if(release.questions.some(question=>ids.has(String(question.id)))) throw new Error('An approved addition would replace a source feedback record.');
    const taskCounts={...data.taskCounts},topicCounts={...data.topicCounts};
    release.questions.forEach(question=>{
      taskCounts[question.taskCode]=Number(taskCounts[question.taskCode]||0)+1;
      topicCounts[question.topic]=Number(topicCounts[question.topic]||0)+1;
    });
    return {...data,meta:{...data.meta,sourceQuestionCount:data.meta.questionCount,questionCount:Number(data.meta.questionCount)+release.questions.length,learnerEligibleCount:Number(data.meta.learnerEligibleCount)+release.questions.length},taskCounts,topicCounts,records:data.records.concat(release.questions.map(compactRecord)),ownerQuestionRelease:releaseMetadata(release,data.meta.questionCount)};
  }
  function decorateBlueprint(data,release){
    if(data.ownerQuestionRelease&&data.ownerQuestionRelease.releaseId===release.releaseId) return data;
    return {...data,domains:(data.domains||[]).map(domain=>({...domain,tasks:(domain.tasks||[]).map(task=>({...task,sourceQuestionCount:task.questionCount,questionCount:Number(task.questionCount||0)+additionsForTask(release,task.code).length}))})),ownerQuestionRelease:releaseMetadata(release,(data.domains||[]).flatMap(domain=>domain.tasks||[]).reduce((count,task)=>count+Number(task.questionCount||0),0))};
  }
  function resourceKind(path){
    const clean=String(path).split(/[?#]/)[0].replace(/^\.\//,'');
    if(clean==='data/blueprint.json') return 'blueprint';
    if(clean==='data/question-bank/manifest.json') return 'manifest';
    if(clean==='data/question-bank/feedback-index.json') return 'feedback';
    if(/^data\/question-bank\/d[1-4][abc](?:-d2c)?\.json$/.test(clean)) return 'module';
    return null;
  }
  function decorate(path,data,release){
    const kind=resourceKind(path);
    if(!kind) return data;
    validateRelease(release);
    return {module:decorateModule,manifest:decorateManifest,feedback:decorateFeedback,blueprint:decorateBlueprint}[kind](data,release);
  }
  function taskCodeFromModulePath(path){
    const clean=String(path).split(/[?#]/)[0].replace(/^\.\//,'');
    const match=clean.match(/^data\/question-bank\/(d[1-4][abc](?:-d2c)?)\.json$/);
    if(!match) return null;
    if(match[1]==='d2a-d2c') return 'D2A/D2C';
    return match[1].toUpperCase();
  }
  function shouldTryD1(){
    // Explicit owner-controlled opt-in. Merging this loader must not silently
    // switch the live learner bank before a separate source-cutover approval.
    if(root.RPSGT_D1_SOURCE_ENABLED!==true) return false;
    const location=root&&root.location;
    if(!location) return false;
    const protocol=String(location.protocol||'');
    const host=String(location.hostname||'').toLowerCase();
    if(protocol!=='https:'&&protocol!=='http:') return false;
    return host==='sleeppathwaysguild.com'||host.endsWith('.sleeppathwaysguild.com')||host.endsWith('.workers.dev');
  }
  async function loadD1Module(path,staticData,release){
    const code=taskCodeFromModulePath(path);
    if(!code) throw new Error('Not a question module path.');
    validateRelease(release);
    const baseQuestions=Array.isArray(staticData&&staticData.questions)?staticData.questions:[];
    const additions=DIRECT_TASKS.includes(code)?additionsForTask(release,code):[];
    const expected=baseQuestions.length+additions.length;
    // An equal count is not enough: a stale or substituted D1 item must not alter
    // learner-facing questions or orphan saved question IDs during this migration.
    const approved=new Map([...baseQuestions,...additions].map(question=>[String(question.id),question]));
    if(approved.size!==expected) throw new Error('Approved static module contains duplicate IDs for '+code+'.');
    const apiPath='/api/questions?program=RPSGT&taskCode='+encodeURIComponent(code)+'&format=source&limit=1000';
    const payload=await fetchJson(apiPath);
    if(!payload||payload.program!=='RPSGT'||payload.taskCode!==code||payload.format!=='source'||!Array.isArray(payload.questions)) throw new Error('D1 module response is invalid for '+code+'.');
    if(payload.questions.length!==expected) throw new Error('D1 module count mismatch for '+code+': expected '+expected+', received '+payload.questions.length+'.');
    const ids=new Set();
    payload.questions.forEach(question=>{
      const id=String(question&&question.id||'');
      if(!id||ids.has(id)||String(question.taskCode||'')!==code||!String(question.prompt||'').trim()||!Array.isArray(question.options)||!question.options.includes(question.answer)) throw new Error('D1 returned an invalid '+code+' question.');
      const source=approved.get(id);
      if(!source) throw new Error('D1 returned an unexpected '+code+' question ID: '+id+'.');
      if(question.prompt!==source.prompt||question.answer!==source.answer||
         !Array.isArray(source.options)||question.options.length!==source.options.length||
         question.options.some((choice,index)=>choice!==source.options[index]))
        throw new Error('D1 question content differs from the approved source for '+id+'.');
      ids.add(id);
    });
    return {...staticData,
      meta:{...(staticData.meta||{}),sourceQuestionCount:baseQuestions.length,questionCount:payload.questions.length,questionSource:'Cloudflare D1 with static module fallback'},
      questions:payload.questions,
      d1QuestionBank:{enabled:true,taskCode:code,count:payload.questions.length,fallback:'static-module'},
      ownerQuestionRelease:releaseMetadata(release,baseQuestions.length),
      ownerReleaseQuestionIds:additions.map(question=>question.id)
    };
  }
  async function fetchJson(path){
    const response=await root.fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }
  // D1/GitHub proposal records are an editorial inbox, not a public feed.
  // This explicitly gated published manifest is the only additional learner-serving path.
  function applyDispatch(base,dispatch){
    validateRelease(base);
    if(!dispatch||dispatch.schemaVersion!==1||dispatch.program!=='RPSGT'||
       !String(dispatch.dispatchId||'').trim()||!Array.isArray(dispatch.questions)||
       !Array.isArray(dispatch.pendingQuestionIds)) throw new Error('RPSGT dispatch manifest is invalid.');
    if(dispatch.status==='held'){
      if(dispatch.questions.length) throw new Error('Held dispatch must not expose learner questions.');
      return base;
    }
    if(dispatch.status!=='published') throw new Error('Unknown RPSGT dispatch state.');
    const gates=dispatch.qaGates||{};
    const mandatory=['ownerClinicalApproved','sourcePassagesReviewed','semanticFamilyReviewCompleted',
      'blueprintTaskPlacementConfirmed','representativeLearnerHistoryRegressionPassed','ownerPublicationAuthorized'];
    if(mandatory.some(key=>gates[key]!==true)||!dispatch.questions.length||
       !String(dispatch.approvalId||'').trim()) throw new Error('RPSGT dispatch still has unmet QA or publication gates.');
    const baseIds=new Set(base.questions.map(question=>String(question.id)));
    const dispatchedIds=new Set();
    dispatch.questions.forEach(question=>{
      const id=String(question&&question.id||'');
      if(!id||baseIds.has(id)||dispatchedIds.has(id)||!dispatch.pendingQuestionIds.includes(id)||
         question.ownerReleaseApproved!==true||question.publicationStatus!=='published-learner-eligible'||
         question.qa?.ownerProfessionalClinicalReviewApproved!==true||
         question.qa?.manualReviewRecommended===true||question.qa?.learnerHistoryRegressionPending===true||
         question.qa?.needsSemanticFamilyReview===true||question.qa?.needsBlueprintTaskReview===true||
         !Array.isArray(question.referencesAPA)||question.referencesAPA.length<2||
         !String(question.qa?.approvedContentSHA256||'').trim()) throw new Error('Unreleased or conflicting dispatch question: '+id);
      dispatchedIds.add(id);
    });
    const added=dispatch.questions.length;
    const merged={...base,questions:base.questions.concat(clone(dispatch.questions)),
      rpsgtAddedCount:Number(base.rpsgtAddedCount)+added,
      effectiveRpsgtCount:Number(base.effectiveRpsgtCount)+added,
      programCounts:{...base.programCounts,RPSGT:Number(base.programCounts.RPSGT)+added},
      dispatchedQuestionCount:added,
      dispatchMetadata:{dispatchId:dispatch.dispatchId,approvalId:dispatch.approvalId,status:'published',count:added}};
    return validateRelease(merged);
  }
  function loadRelease(){
    if(!releasePromise) releasePromise=Promise.all([fetchJson(RELEASE_PATH),fetchJson(DISPATCH_PATH)])
      .then(([base,dispatch])=>applyDispatch(base,dispatch));
    return releasePromise;
  }
  async function loadJson(path){
    const data=await fetchJson(path);
    const kind=resourceKind(path);
    if(!kind) return data;
    const release=await loadRelease();
    if(kind==='module'&&shouldTryD1()){
      try{return await loadD1Module(path,data,release);}
      catch(error){
        if(root.console&&typeof root.console.warn==='function') root.console.warn('RPSGT D1 question-bank fallback:',error&&error.message||error);
      }
    }
    return decorate(path,data,release);
  }
  return {RELEASE_ID,RELEASE_PATH,DISPATCH_PATH,validateRelease,applyDispatch,resourceKind,decorate,taskCodeFromModulePath,shouldTryD1,loadD1Module,loadJson};
});
