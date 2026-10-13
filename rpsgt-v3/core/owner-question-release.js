(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTOwnerQuestionRelease=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const RELEASE_ID='spg-owner-question-release-2026-10-11';
  const RELEASE_PATH='../data/owner-approved-question-release.json';
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
  async function fetchJson(path){
    const response=await root.fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(path+' HTTP '+response.status);
    return response.json();
  }
  function loadRelease(){
    if(!releasePromise) releasePromise=fetchJson(RELEASE_PATH).then(validateRelease);
    return releasePromise;
  }
  async function loadJson(path){
    const data=await fetchJson(path);
    return resourceKind(path)?decorate(path,data,await loadRelease()):data;
  }
  return {RELEASE_ID,RELEASE_PATH,validateRelease,resourceKind,decorate,loadJson};
});
