-- RPSGT Question Rehabilitation pilot QA (read-only)
-- Cloudflare D1: sleep_pathways_tutor_dev
-- Batch RPSGT-REHAB-2026-11-08-P25
-- Running this query NEVER changes or publishes canonical questions.

SELECT
  COUNT(*) AS pilot_total,
  SUM(CASE WHEN r.review_state='rewrite-drafted' THEN 1 ELSE 0 END) AS draft_count,
  SUM(CASE WHEN json_valid(r.proposed_rewrite_json)=1 THEN 1 ELSE 0 END) AS valid_json_count,
  SUM(CASE WHEN json_array_length(json_extract(r.proposed_rewrite_json,'$.options'))=4 THEN 1 ELSE 0 END) AS four_option_count,
  SUM(CASE WHEN json_array_length(json_extract(r.proposed_rewrite_json,'$.distractor_rationales'))=4 THEN 1 ELSE 0 END) AS four_explanation_count,
  SUM(CASE WHEN json_extract(r.proposed_rewrite_json,'$.correct_answer')
     = json_extract(r.proposed_rewrite_json,'$.options[' || json_extract(r.proposed_rewrite_json,'$.correct_answer_index') || ']')
     THEN 1 ELSE 0 END) AS answer_key_consistent_count,
  SUM(CASE WHEN json_extract(r.proposed_rewrite_json,'$.publication_status')
    = 'draft-not-learner-eligible' THEN 1 ELSE 0 END) AS unpublished_count,
  SUM(CASE WHEN r.source_content_hash=q.content_hash THEN 1 ELSE 0 END) AS unchanged_source_hash_count,
  SUM(CASE WHEN r.clinical_verification<>'verified' THEN 1 ELSE 0 END) AS awaiting_independent_clinical_review_count
FROM spg_question_rehab_reviews AS r
JOIN spg_questions AS q ON q.question_id=r.question_id
WHERE r.batch_id='RPSGT-REHAB-2026-11-08-P25';

-- Per-question exceptions, should return zero rows for a structurally valid pilot.
SELECT r.question_id,
       q.domain, q.task_code, r.review_state,
       r.reference_verification, r.clinical_verification
FROM spg_question_rehab_reviews AS r
JOIN spg_questions AS q ON q.question_id=r.question_id
WHERE r.batch_id='RPSGT-REHAB-2026-11-08-P25'
  AND (
    r.review_state<>'rewrite-drafted'
    OR json_valid(r.proposed_rewrite_json)<>1
    OR json_array_length(json_extract(r.proposed_rewrite_json,'$.options'))<>4
    OR json_array_length(json_extract(r.proposed_rewrite_json,'$.distractor_rationales'))<>4
    OR json_extract(r.proposed_rewrite_json,'$.correct_answer')
      IS NOT json_extract(r.proposed_rewrite_json, '$.options['
        || json_extract(r.proposed_rewrite_json,'$.correct_answer_index') || ']')
    OR json_extract(r.proposed_rewrite_json,'$.publication_status')<>'draft-not-learner-eligible'
    OR r.source_content_hash<>q.content_hash
  )
ORDER BY r.question_id;

-- No record here is clinically approved merely because its draft passes QA.
-- Release still requires direct reference verification and owner approval.
