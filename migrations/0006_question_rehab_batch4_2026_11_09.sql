-- RPSGT rehabilitation — Batch 4 intake (25 source questions), 2026-11-09
-- EDITORIAL / NON-PUBLISHING ONLY. Preserve all original questions and eligibility.
-- Requires 0002_question_rehab_reviews.sql and earlier intake migrations.
INSERT OR IGNORE INTO spg_question_rehab_reviews
(question_id,program,source_content_hash,intake_reason)
SELECT question_id,program,content_hash,'manual_review_recommended=1'
FROM spg_questions WHERE program='RPSGT' AND manual_review_recommended=1;

-- D1 6; D2 7; D3 6; D4 6. All currently populated task codes represented;
-- D3 Task B currently has no further queued manual-review items.
UPDATE spg_question_rehab_reviews
SET batch_id='RPSGT-REHAB-2026-11-09-P25-B4',
    priority=1,
    review_state=CASE WHEN review_state='queued' THEN 'pilot-triage' ELSE review_state END,
    review_notes=CASE WHEN review_state='queued' THEN
      'Batch 4 intake. Primary-science, licensed-scoring-rule, APA 7, exact BRPT placement and owner approval all required before publication.'
      ELSE review_notes END,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (
    'RPSGT-B3-C008',
    'RPSGT-MOCK-D1-091',
    'RPSGT-B4-R007',
    'RPSGT-B6-S108',
    'RPSGT-B3-C022',
    'RPSGT-B4-R150',
    'RPSGT-B4-R013',
    'RPSGT-B3-C035',
    'RPSGT-MOCK-D2-061',
    'RPSGT-B2-M054',
    'RPSGT-B3-C048',
    'RPSGT-B3-C062',
    'RPSGT-B3-C059',
    'RPSGT-B2-M080',
    'RPSGT-B2-M083',
    'RPSGT-B2-M085',
    'RPSGT-B2-M087',
    'RPSGT-B2-M106',
    'RPSGT-B3-C103',
    'RPSGT-B2-M114',
    'RPSGT-B2-M126',
    'nm-041',
    'RPSGT-B3-C143',
    'RPSGT-B4-R068',
    'RPSGT-B3-C148'
)
AND review_state IN ('queued','pilot-triage','rewrite-drafted')
AND (batch_id='' OR batch_id='RPSGT-REHAB-2026-11-09-P25-B4');

-- Only review-state metadata is seeded here. Proposed rewrites are separately
-- recorded in proposed_rewrite_json in D1; do not promote them automatically.
