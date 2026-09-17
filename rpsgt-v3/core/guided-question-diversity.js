(function(root){
  'use strict';

  const engine=root&&root.RPSGTGuidedTrailEngine;
  if(!engine||typeof engine.selectQuestions!=='function'||engine.__semanticDiversityWrapped) return;

  const VERSION='1.0.0';
  const RECENT_WINDOW=3;
  const EXPANSION_FACTOR=8;
  const STRICT_SIMILARITY=.70;
  const RELAXED_SIMILARITY=.82;
  const STOP_WORDS=new Set([
    'a','an','and','are','as','at','be','been','being','but','by','can','could','did','do','does','during','for','from','had','has','have','how','if','in','into','is','it','its','may','most','of','on','or','should','that','the','their','then','there','these','this','to','was','were','what','when','which','while','who','with','would','you','your'
  ]);
  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  const text=value=>String(value==null?'':value).trim();

  function normalizeStem(value){
    return text(value)
      .replace(/^[\s[(]*(?:practice\s*)?(?:question|item)\s*(?:#\s*)?\d+\s*[:.)\]-]?\s*/i,'')
      .replace(/^[\s[(]*\d+\s*[:.)\]-]\s*/,'')
      .toLowerCase()
      .replace(/[“”]/g,'"')
      .replace(/[‘’]/g,"'")
      .replace(/\b\d+(?:\.\d+)?(?:\s*%|\s*\/\s*\d+)?\b/g,' # ')
      .replace(/[^a-z0-9#]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function stemToken(token){
    if(token==='#') return token;
    let value=token;
    if(value.length>6&&value.endsWith('ies')) value=value.slice(0,-3)+'y';
    else if(value.length>6&&value.endsWith('ing')) value=value.slice(0,-3);
    else if(value.length>5&&value.endsWith('ed')) value=value.slice(0,-2);
    else if(value.length>5&&value.endsWith('es')) value=value.slice(0,-2);
    else if(value.length>4&&value.endsWith('s')) value=value.slice(0,-1);
    return value;
  }

  function tokenSet(value){
    const normalized=normalizeStem(value);
    const tokens=normalized.split(' ').map(stemToken).filter(token=>token&&token.length>1&&!STOP_WORDS.has(token));
    return new Set(tokens);
  }

  function similarity(left,right){
    const a=left instanceof Set?left:tokenSet(left);
    const b=right instanceof Set?right:tokenSet(right);
    if(!a.size||!b.size) return 0;
    let intersection=0;
    a.forEach(token=>{if(b.has(token)) intersection+=1;});
    const union=a.size+b.size-intersection;
    const jaccard=union?intersection/union:0;
    const smaller=Math.min(a.size,b.size);
    const overlap=smaller?intersection/smaller:0;
    return Math.max(jaccard,overlap);
  }

  function profile(question){
    return {
      id:text(question&&question.id),
      family:normalizeStem(question&&question.prompt),
      tokens:tokenSet(question&&question.prompt),
      topic:normalizeStem(question&&question.topic)||'other',
      question
    };
  }

  function recentProfiles(records,taskCode){
    try{
      const storage=root&&root.RPSGTStorage;
      if(!storage||typeof storage.load!=='function') return [];
      const saved=storage.load();
      const history=saved&&saved.guidedStudy&&Array.isArray(saved.guidedStudy.checkpointHistory)?saved.guidedStudy.checkpointHistory:[];
      const ids=new Set(history.filter(item=>item&&item.task===taskCode).slice(0,RECENT_WINDOW).flatMap(item=>Array.isArray(item.questionIds)?item.questionIds:[]).map(String));
      if(!ids.size) return [];
      return (records||[]).filter(question=>ids.has(String(question&&question.id))).map(profile);
    }catch(error){
      return [];
    }
  }

  function conflicts(candidate,profiles,threshold){
    return profiles.some(existing=>candidate.family===existing.family||similarity(candidate.tokens,existing.tokens)>=threshold);
  }

  function selectDiverse(candidates,count,recent){
    const desired=Math.max(0,Math.floor(Number(count)||0));
    if(!desired) return [];
    const profiles=[];
    const seenIds=new Set();
    (Array.isArray(candidates)?candidates:[]).forEach(question=>{
      const item=profile(question);
      if(!item.id||seenIds.has(item.id)) return;
      seenIds.add(item.id);
      profiles.push(item);
    });
    if(profiles.length<=desired) return profiles.map(item=>clone(item.question));

    const selected=[];
    const selectedIds=new Set();
    const selectedFamilies=new Set();
    const topicCounts=new Map();
    const recentList=Array.isArray(recent)?recent:[];
    const topicLimit=Math.max(2,Math.ceil(desired/3));

    function addPass(options){
      for(const candidate of profiles){
        if(selected.length>=desired) break;
        if(selectedIds.has(candidate.id)) continue;
        if(options.uniqueFamily!==false&&selectedFamilies.has(candidate.family)) continue;
        if(options.avoidRecent&&conflicts(candidate,recentList,options.recentThreshold||STRICT_SIMILARITY)) continue;
        if(options.topicLimit&&Number(topicCounts.get(candidate.topic)||0)>=options.topicLimit) continue;
        if(options.similarityThreshold&&conflicts(candidate,selected,options.similarityThreshold)) continue;
        selected.push(candidate);
        selectedIds.add(candidate.id);
        selectedFamilies.add(candidate.family);
        topicCounts.set(candidate.topic,Number(topicCounts.get(candidate.topic)||0)+1);
      }
    }

    addPass({avoidRecent:true,recentThreshold:STRICT_SIMILARITY,topicLimit,similarityThreshold:STRICT_SIMILARITY});
    addPass({avoidRecent:true,recentThreshold:RELAXED_SIMILARITY,topicLimit:topicLimit+2,similarityThreshold:RELAXED_SIMILARITY});
    addPass({avoidRecent:false,topicLimit:topicLimit+2,similarityThreshold:STRICT_SIMILARITY});
    addPass({avoidRecent:false,topicLimit:null,similarityThreshold:RELAXED_SIMILARITY});
    addPass({avoidRecent:false,topicLimit:null,similarityThreshold:null});
    addPass({avoidRecent:false,topicLimit:null,similarityThreshold:null,uniqueFamily:false});

    return selected.slice(0,desired).map(item=>clone(item.question));
  }

  const originalSelect=engine.selectQuestions.bind(engine);
  engine.selectQuestions=function(records,taskCode,count,seed,filter){
    const desired=Math.max(0,Math.floor(Number(count)||Number(engine.BADGE_QUESTION_COUNT)||15));
    if(!desired) return [];
    const source=Array.isArray(records)?records:[];
    const expanded=Math.min(source.length,Math.max(desired,desired*EXPANSION_FACTOR));
    const candidates=originalSelect(records,taskCode,expanded,seed,filter);
    if(candidates.length<=desired) return candidates.slice(0,desired).map(clone);
    return selectDiverse(candidates,desired,recentProfiles(source,taskCode));
  };
  engine.__semanticDiversityWrapped=true;

  root.RPSGTGuidedQuestionDiversity={
    VERSION,
    RECENT_WINDOW,
    EXPANSION_FACTOR,
    STRICT_SIMILARITY,
    RELAXED_SIMILARITY,
    normalizeStem,
    tokenSet,
    similarity,
    selectDiverse
  };
})(typeof globalThis!=='undefined'?globalThis:this);
