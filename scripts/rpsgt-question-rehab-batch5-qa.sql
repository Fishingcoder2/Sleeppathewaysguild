-- RPSGT flagged-question rehabilitation — Batch 5 read-only QA.
-- Safe to run in Cloudflare D1: it DOES NOT update canonical questions or drafts.

WITH batch AS (
SELECT r.question_id,r.review_state,r.blueprint_verification,r.clinical_verification,
       r.reference_verification,r.source_content_hash,q.content_hash,
       r.proposed_rewrite_json AS p
FROM spg_question_rehab_reviews r
JOIN spg_questions q USING(question_id)
WHERE r.batch_id='RPSGT-REHAB-2026-11-09-P25-B5'
)
SELECT COUNT(*) AS batch_count,
SUM(review_state='rewrite-drafted') AS drafts,
SUM(json_valid(p)=1) AS valid_json,
SUM(json_array_length(json_extract(p,'$.options'))=4) AS four_choices,
SUM(json_array_length(json_extract(p,'$.distractor_rationales'))=4) AS four_explanations,
SUM(json_extract(p,'$.correct_answer')
    =json_extract(p,'$.options['||json_extract(p,'$.correct_answer_index')||']'))
    AS answer_key_consistency,
SUM(json_extract(p,'$.publication_status')='draft-not-learner-eligible') AS unpublished,
SUM(source_content_hash=content_hash) AS source_hash_matches,
SUM(json_extract(p,'$.citation_qa')='pending-formal-apa7-and-exact-locator-check') AS apa7_holds,
SUM(clinical_verification<>'verified') AS independent_clinical_review_outstanding
FROM batch;

-- Structural exception query: must return zero rows on a complete batch.
SELECT r.question_id,q.domain,q.task_code,r.review_state,r.reference_verification
FROM spg_question_rehab_reviews r
JOIN spg_questions q USING(question_id)
WHERE r.batch_id='RPSGT-REHAB-2026-11-09-P25-B5'
AND (
 r.review_state <> 'rewrite-drafted'
 OR json_valid(r.proposed_rewrite_json) <> 1
 OR json_array_length(json_extract(r.proposed_rewrite_json,'$.options')) <> 4
 OR json_array_length(json_extract(r.proposed_rewrite_json,'$.distractor_rationales')) <> 4
 OR json_extract(r.proposed_rewrite_json,'$.correct_answer')
    IS NOT json_extract(r.proposed_rewrite_json,'$.options['
      ||json_extract(r.proposed_rewrite_json,'$.correct_answer_index')||']')
 OR json_extract(r.proposed_rewrite_json,'$.publication_status')<>'draft-not-learner-eligible'
 OR r.source_content_hash <> q.content_hash
);

-- These checks do not assert clinical correctness, blueprint approval, or publication.
