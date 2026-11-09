-- Batch 4 RPSGT question rehabilitation read-only QA.
-- This file NEVER changes canonical questions, releases, or user eligibility.

WITH batch AS (
SELECT r.question_id,r.review_state,r.blueprint_verification,
r.clinical_verification,r.reference_verification,r.proposed_rewrite_json p,
r.source_content_hash,q.content_hash
FROM spg_question_rehab_reviews r
JOIN spg_questions q USING(question_id)
WHERE r.batch_id='RPSGT-REHAB-2026-11-09-P25-B4'
)
SELECT COUNT(*) total, SUM(review_state='rewrite-drafted') drafts,
SUM(json_valid(p)=1) valid_json,
SUM(json_array_length(json_extract(p,'$.options'))=4) four_options,
SUM(json_array_length(json_extract(p,'$.distractor_rationales'))=4) four_explanations,
SUM(json_extract(p,'$.correct_answer')
  =json_extract(p,'$.options['||json_extract(p,'$.correct_answer_index')||']')) matching_keys,
SUM(json_extract(p,'$.publication_status')='draft-not-learner-eligible') unpublished,
SUM(json_extract(p,'$.citation_qa')='pending-formal-apa7-and-exact-locator-check') apa_pending,
SUM(source_content_hash=content_hash) source_hash_matches,
SUM(clinical_verification<>'verified') clinical_approvals_pending
FROM batch;

-- 0 rows expected for structural or source-preservation violations.
SELECT r.question_id,r.review_state,r.reference_verification
FROM spg_question_rehab_reviews r
JOIN spg_questions q USING(question_id)
WHERE r.batch_id='RPSGT-REHAB-2026-11-09-P25-B4'
AND (
r.review_state<>'rewrite-drafted'
OR json_valid(r.proposed_rewrite_json)<>1
OR json_array_length(json_extract(r.proposed_rewrite_json,'$.options'))<>4
OR json_array_length(json_extract(r.proposed_rewrite_json,'$.distractor_rationales'))<>4
OR json_extract(r.proposed_rewrite_json,'$.correct_answer')
   IS NOT json_extract(r.proposed_rewrite_json,'$.options['||json_extract(r.proposed_rewrite_json,'$.correct_answer_index')||']')
OR json_extract(r.proposed_rewrite_json,'$.publication_status')<>'draft-not-learner-eligible'
OR r.source_content_hash<>q.content_hash
);
