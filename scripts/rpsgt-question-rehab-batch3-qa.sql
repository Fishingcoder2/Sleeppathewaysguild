-- Batch 3 RPSGT question rehabilitation: READ-ONLY QA
-- Review batch: RPSGT-REHAB-2026-11-09-P25-B3
-- All source questions and learner eligibility must remain unchanged.

WITH batch AS (
 SELECT r.question_id,r.review_state,r.blueprint_verification,
        r.clinical_verification,r.reference_verification,
        r.source_content_hash,q.content_hash,
        r.proposed_rewrite_json p
 FROM spg_question_rehab_reviews r
 JOIN spg_questions q USING(question_id)
 WHERE r.batch_id='RPSGT-REHAB-2026-11-09-P25-B3'
)
SELECT COUNT(*) AS batch_count,
 SUM(review_state='rewrite-drafted') AS drafted,
 SUM(json_valid(p)=1) AS valid_json,
 SUM(json_array_length(json_extract(p,'$.options'))=4) AS four_option_items,
 SUM(json_array_length(json_extract(p,'$.distractor_rationales'))=4) AS four_explanations,
 SUM(json_extract(p,'$.correct_answer')
      =json_extract(p,'$.options[' || json_extract(p,'$.correct_answer_index') || ']'))
     AS keyed_answers_valid,
 SUM(json_extract(p,'$.publication_status')='draft-not-learner-eligible') AS unpublished,
 SUM(json_extract(p,'$.citation_qa')='pending-formal-apa7-and-exact-locator-check') AS apa_qa_pending,
 SUM(source_content_hash=content_hash) AS original_hash_unchanged,
 SUM(clinical_verification<>'verified') AS independent_clinical_review_pending
FROM batch;

-- Should return NO rows for structural or preservation problems.
SELECT r.question_id,q.domain,q.task_code,r.review_state
FROM spg_question_rehab_reviews r JOIN spg_questions q USING(question_id)
WHERE r.batch_id='RPSGT-REHAB-2026-11-09-P25-B3'
AND (
 r.review_state<>'rewrite-drafted'
 OR json_valid(r.proposed_rewrite_json)<>1
 OR json_array_length(json_extract(r.proposed_rewrite_json,'$.options'))<>4
 OR json_array_length(json_extract(r.proposed_rewrite_json,'$.distractor_rationales'))<>4
 OR json_extract(r.proposed_rewrite_json,'$.correct_answer') IS NOT
    json_extract(r.proposed_rewrite_json,'$.options['||
       json_extract(r.proposed_rewrite_json,'$.correct_answer_index') ||']')
 OR json_extract(r.proposed_rewrite_json,'$.publication_status')<>'draft-not-learner-eligible'
 OR r.source_content_hash<>q.content_hash
);

-- Show source and blueprint holds; *none* of these are owner approved.
SELECT question_id,reference_verification,blueprint_verification
FROM spg_question_rehab_reviews
WHERE batch_id='RPSGT-REHAB-2026-11-09-P25-B3'
ORDER BY question_id;
