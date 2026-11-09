-- RPSGT flagged-question rehabilitation: batch 2 read-only audit
-- Does not publish or alter any source or draft data.
-- A structurally valid draft is NOT the same as clinical or bibliographic approval.

WITH selected AS (
 SELECT r.question_id, r.review_state, r.reference_verification,
        r.clinical_verification, r.blueprint_verification,
        r.proposed_rewrite_json AS p,
        r.source_content_hash, q.content_hash,
        q.domain, q.task_code, q.publication_status AS original_publication_status
 FROM spg_question_rehab_reviews r
 JOIN spg_questions q USING(question_id)
 WHERE r.batch_id='RPSGT-REHAB-2026-11-09-P25-B2'
)
SELECT COUNT(*) AS batch_count,
       SUM(review_state='rewrite-drafted') AS drafts,
       SUM(json_valid(p)=1) AS valid_json,
       SUM(json_array_length(json_extract(p,'$.options'))=4) AS four_options,
       SUM(json_array_length(json_extract(p,'$.distractor_rationales'))=4) AS four_explanations,
       SUM(json_extract(p,'$.correct_answer')=
           json_extract(p,'$.options['||json_extract(p,'$.correct_answer_index')||']')) AS valid_key,
       SUM(json_extract(p,'$.publication_status')='draft-not-learner-eligible') AS unpublished,
       SUM(source_content_hash=content_hash) AS source_hash_matches,
       SUM(json_extract(p,'$.citation_qa')='pending-formal-apa7-and-exact-locator-check') AS apa_holds,
       SUM(clinical_verification<>'verified') AS clinical_review_holds
FROM selected;

-- This should return zero rows for structural/immutability failures.
SELECT r.question_id, q.domain, q.task_code, r.reference_verification
FROM spg_question_rehab_reviews r
JOIN spg_questions q USING(question_id)
WHERE r.batch_id='RPSGT-REHAB-2026-11-09-P25-B2'
AND (
  r.review_state <> 'rewrite-drafted'
  OR json_valid(r.proposed_rewrite_json) <> 1
  OR json_array_length(json_extract(r.proposed_rewrite_json,'$.options')) <> 4
  OR json_array_length(json_extract(r.proposed_rewrite_json,'$.distractor_rationales')) <> 4
  OR json_extract(r.proposed_rewrite_json,'$.correct_answer') IS NOT
     json_extract(r.proposed_rewrite_json,'$.options[' ||
       json_extract(r.proposed_rewrite_json,'$.correct_answer_index') || ']')
  OR json_extract(r.proposed_rewrite_json,'$.publication_status')
       <> 'draft-not-learner-eligible'
  OR r.source_content_hash <> q.content_hash
);

-- Owner/clinical approval and exact AASM V3 passage checks must be separate gates.
