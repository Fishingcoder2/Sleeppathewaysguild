-- RPSGT flagged-question rehabilitation — Batch 3, November 9, 2026.
-- Requires 0002_question_rehab_reviews.sql and earlier intake migrations.
-- Editorial REVIEW only; this migration does not change spg_questions,
-- spg_question_eligibility, spg_question_versions, or active releases.

INSERT OR IGNORE INTO spg_question_rehab_reviews
  (question_id, program, source_content_hash, intake_reason)
SELECT question_id,program,content_hash,'manual_review_recommended=1'
FROM spg_questions
WHERE program='RPSGT' AND manual_review_recommended=1;

-- D1 6, D2 7, D3 6, D4 6. All available task groups covered;
-- D3B has no additional queued flags as of this batch.
-- One original D2A/D2C record remains unmapped.
-- Two more original blueprint placements are specifically questioned in review,
-- but no task_code is altered automatically.

UPDATE spg_question_rehab_reviews
SET batch_id='RPSGT-REHAB-2026-11-09-P25-B3',
    priority=1,
    review_state=CASE WHEN review_state='queued' THEN 'pilot-triage' ELSE review_state END,
    review_notes=CASE WHEN review_state='queued'
      THEN 'Batch 3 editorial intake only. Independently verify AASM/AAST and other primary-source passages, BRPT blueprint item, clinical rationale, citations and owner approval.'
      ELSE review_notes END,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (
    'RPSGT-B3-C001',
    'RPSGT-B3-C010',
    'RPSGT-B3-C019',
    'RPSGT-B6-S098',
    'RPSGT-B3-C025',
    'RPSGT-B3-C029',
    'RPSGT-B2-M044',
    'RPSGT-B3-C042',
    'RPSGT-MOCK-D2-063',
    'RPSGT-B2-M058',
    'RPSGT-B3-C047',
    'RPSGT-B2-M069',
    'RPSGT-B3-C061',
    'RPSGT-B2-M078',
    'RPSGT-B2-M079',
    'RPSGT-B2-M081',
    'RPSGT-B2-M082',
    'RPSGT-B3-C102',
    'RPSGT-B2-M109',
    'RPSGT-B2-M116',
    'RPSGT-B2-M121',
    'RPSGT-B3-C140',
    'nm-045',
    'RPSGT-B2-M150',
    'RPSGT-B3-C149'
)
AND review_state IN ('queued','pilot-triage','rewrite-drafted')
AND (batch_id='' OR batch_id='RPSGT-REHAB-2026-11-09-P25-B3');

-- Candidate text is staged exclusively in proposed_rewrite_json.
-- Editing this queue does not authorize publication or student use.
