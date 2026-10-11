// Approved additions are a separately versioned runtime layer. Re-extracting
// the canonical V2 page must not fold that layer into V3 source modules.
export function splitOwnerReleaseQuestions(records){
  const sourceQuestions=[];
  const ownerReleaseQuestions=[];
  for(const question of records){
    if(question?.ownerReleaseApproved===true&&String(question?.ownerRelease?.releaseId||'').trim()) ownerReleaseQuestions.push(question);
    else sourceQuestions.push(question);
  }
  return {sourceQuestions,ownerReleaseQuestions};
}
