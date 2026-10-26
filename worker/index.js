const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':status===200?'public, max-age=60, s-maxage=300':'no-store',
    ...extra
  }
});

function normalizeProgram(value){
  const program=String(value||'').trim().toUpperCase();
  return program==='RPSGT'||program==='CPSGT'?program:null;
}
function clampLimit(value){
  const n=Number(value||100);
  if(!Number.isFinite(n)) return 100;
  return Math.max(1,Math.min(1000,Math.trunc(n)));
}
function publicQuestion(row){
  return {
    id:row.question_id,
    program:row.program,
    domain:row.domain,
    taskCode:row.task_code,
    task:row.task_label,
    topic:row.topic,
    prompt:row.prompt,
    options:JSON.parse(row.options_json||'[]'),
    answer:row.answer,
    rationale:row.rationale,
    distractorRationales:JSON.parse(row.distractor_rationales_json||'{}'),
    referenceKeys:JSON.parse(row.reference_keys_json||'[]'),
    studyRecommendationKeys:JSON.parse(row.study_recommendation_keys_json||'[]'),
    publicationStatus:row.publication_status,
    reviewStatus:row.review_status,
    eligibility:{
      practice:Boolean(row.practice_eligible),
      readiness:Boolean(row.readiness_eligible),
      mock:Boolean(row.mock_eligible),
      reportResolvable:Boolean(row.report_resolvable),
      learnerExcluded:Boolean(row.learner_excluded),
      exclusionReason:row.exclusion_reason||'',
      duplicateFamily:row.duplicate_family||''
    },
    version:{
      contentHash:row.content_hash,
      eligibilityVersion:row.eligibility_version
    }
  };
}

async function questionVersion(env,program){
  const release=await env.DB.prepare(
    "SELECT release_id,source_count,effective_count,release_hash,status,published_at,created_at FROM spg_question_releases WHERE program=? AND status IN ('validated','published') ORDER BY COALESCE(published_at,created_at) DESC LIMIT 1"
  ).bind(program).first();
  const counts=await env.DB.prepare(
    "SELECT COUNT(*) total, SUM(CASE WHEN e.practice_eligible=1 THEN 1 ELSE 0 END) practice, SUM(CASE WHEN e.readiness_eligible=1 THEN 1 ELSE 0 END) readiness, SUM(CASE WHEN e.mock_eligible=1 THEN 1 ELSE 0 END) mock FROM spg_questions q LEFT JOIN spg_question_eligibility e ON e.question_id=q.question_id WHERE q.program=? AND q.active=1"
  ).bind(program).first();
  return {program,release:release||null,counts:counts||{total:0,practice:0,readiness:0,mock:0}};
}

async function handleApi(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET') return json({error:'method_not_allowed'},405,{allow:'GET'});

  if(url.pathname==='/api/question-bank/version'){
    const program=normalizeProgram(url.searchParams.get('program'));
    if(!program) return json({error:'program_required',allowed:['RPSGT','CPSGT']},400);
    return json(await questionVersion(env,program));
  }

  if(url.pathname==='/api/questions'){
    const program=normalizeProgram(url.searchParams.get('program'));
    if(!program) return json({error:'program_required',allowed:['RPSGT','CPSGT']},400);
    const domain=String(url.searchParams.get('domain')||'').trim();
    const taskCode=String(url.searchParams.get('taskCode')||'').trim();
    const surface=String(url.searchParams.get('surface')||'').trim().toLowerCase();
    const limit=clampLimit(url.searchParams.get('limit'));
    const offset=Math.max(0,Number.parseInt(url.searchParams.get('offset')||'0',10)||0);

    const where=['q.program=?','q.active=1'];
    const params=[program];
    if(domain){where.push('q.domain=?');params.push(domain);}
    if(taskCode){where.push('q.task_code=?');params.push(taskCode);}
    if(surface==='practice') where.push('e.practice_eligible=1');
    else if(surface==='readiness') where.push('e.readiness_eligible=1');
    else if(surface==='mock') where.push('e.mock_eligible=1');
    else if(surface==='lms-d2') where.push("e.lms_sync_eligible=1 AND q.domain='D2'");

    const sql=`SELECT q.*,e.practice_eligible,e.readiness_eligible,e.mock_eligible,e.report_resolvable,e.exclusion_reason,e.duplicate_family,e.eligibility_version
      FROM spg_questions q
      LEFT JOIN spg_question_eligibility e ON e.question_id=q.question_id
      WHERE ${where.join(' AND ')}
      ORDER BY q.domain,q.task_code,q.question_id
      LIMIT ? OFFSET ?`;
    params.push(limit,offset);
    const result=await env.DB.prepare(sql).bind(...params).all();
    return json({program,domain:domain||null,taskCode:taskCode||null,surface:surface||null,limit,offset,questions:(result.results||[]).map(publicQuestion)});
  }

  const match=url.pathname.match(/^\/api\/question\/([^/]+)$/);
  if(match){
    const id=decodeURIComponent(match[1]);
    const row=await env.DB.prepare(
      `SELECT q.*,e.practice_eligible,e.readiness_eligible,e.mock_eligible,e.report_resolvable,e.exclusion_reason,e.duplicate_family,e.eligibility_version
       FROM spg_questions q LEFT JOIN spg_question_eligibility e ON e.question_id=q.question_id
       WHERE q.question_id=? AND q.active=1 LIMIT 1`
    ).bind(id).first();
    return row?json(publicQuestion(row)):json({error:'not_found'},404);
  }

  return json({error:'not_found'},404);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')) return handleApi(request,env);
    return env.ASSETS.fetch(request);
  }
};
