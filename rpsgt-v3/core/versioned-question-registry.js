// PROTOTYPE ONLY (Issue #30). Not loaded by any learner-facing page.
// New sessions use a controlled selection view; saved attempts resolve immutable old IDs.
// Do not activate this module without clinical, source, semantic, history and owner release gates.
(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.RPSGTVersionedQuestionRegistry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const REQUIRED_GATES=Object.freeze([
    'ownerEditorialApproved',
    'ownerClinicalApproved',
    'sourcePassagesReviewed',
    'semanticFamilyReviewCompleted',
    'blueprintTaskPlacementConfirmed',
    'representativeLearnerHistoryRegressionPassed',
    'ownerPublicationAuthorized'
  ]);
  const copy=value=>JSON.parse(JSON.stringify(value));
  const idOf=value=>String(value==null?'':value).trim();

  function assertUniqueBank(bank){
    if(!Array.isArray(bank)) throw new Error('Question bank must be an array.');
    const ids=new Set();
    for(const question of bank){
      const id=idOf(question&&question.id);
      if(!id || ids.has(id)) throw new Error('Missing or duplicate historical question ID: '+id);
      ids.add(id);
    }
    return ids;
  }

  function buildView(originalBank,requests=[]){
    if(!Array.isArray(requests)) throw new Error('Revision requests must be an array.');
    const originals=copy(originalBank);
    const allIds=assertUniqueBank(originals);
    const archive=originals.slice();
    const superseded=new Map();
    const revised=[];
    const requestIds=new Set();

    for(const request of requests){
      if(!request || !['held','published'].includes(request.status))
        throw new Error('Revision status must be held or published.');
      const previous=idOf(request.supersedesId);
      if(!previous || !allIds.has(previous) || requestIds.has(previous))
        throw new Error('Missing or multiply superseded historical ID: '+previous);
      requestIds.add(previous);

      // Held proposals are metadata only: no new learner IDs, no archive mutation.
      if(request.status==='held') continue;

      const gates=request.qaGates||{};
      if(REQUIRED_GATES.some(key=>gates[key]!==true))
        throw new Error('Revision cannot publish with incomplete release gates: '+previous);
      const question=copy(request.question);
      const id=idOf(question&&question.id);
      if(!id || id===previous || allIds.has(id))
        throw new Error('Revised question ID must be new and unique: '+id);
      if(question.revisionOf!==previous || question.ownerReleaseApproved!==true ||
         question.publicationStatus!=='published-learner-eligible' ||
         question.learnerExcluded===true || question.qa?.learnerExcluded===true ||
         question.qa?.manualReviewRecommended===true || question.reviewStatus==='retired' ||
         !question.taskCode || question.domain!==question.taskCode.slice(0,2) ||
         !Array.isArray(question.options) || question.options.length<2 ||
         !question.options.includes(question.answer) ||
         !Array.isArray(question.referencesAPA) || question.referencesAPA.length<2)
        throw new Error('Revised item fails question or citation requirements: '+id);
      allIds.add(id);
      superseded.set(previous,id);
      revised.push(question);
      archive.push(question);
    }

    const newSessionBank=originals.filter(q=>!superseded.has(String(q.id))).concat(revised);
    const archiveMap=new Map(archive.map(q=>[String(q.id),q]));
    const resolveSavedIds=(ids)=>{
      if(!Array.isArray(ids)) throw new Error('Saved question IDs must be an array.');
      return ids.map(id=>{
        const question=archiveMap.get(idOf(id));
        if(!question) throw new Error('Unresolved historical question ID: '+idOf(id));
        return copy(question);
      });
    };
    return {
      // These arrays are independent copies; original records and saved answers are not rewritten.
      newSessionBank:copy(newSessionBank),
      historicalBank:copy(archive),
      supersededIds:Object.fromEntries(superseded),
      resolveSavedIds,
      publishedRevisions:revised.length
    };
  }
  return {REQUIRED_GATES,assertUniqueBank,buildView};
});
