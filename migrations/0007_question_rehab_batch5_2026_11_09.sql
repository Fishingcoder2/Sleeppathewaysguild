-- Sleep Pathways Guild — RPSGT flagged-question rehabilitation Batch 5
-- November 9, 2026. Non-publishing/editorial intake ONLY.
-- Requires 0002_question_rehab_reviews.sql and earlier intake migrations.
-- Does not change spg_questions, original answers, eligibility, versions, or releases.

INSERT OR IGNORE INTO spg_question_rehab_reviews
 (question_id, program, source_content_hash, intake_reason)
SELECT question_id,program,content_hash,'manual_review_recommended=1'
FROM spg_questions
WHERE program='RPSGT' AND manual_review_recommended=1;

-- D1=6; D2=7; D3=6; D4=6.
-- One original D2A/D2C task code is unresolved; candidate mapping is editorial.
-- D4B and D3B are not represented because no additional queued records
-- remained in those task categories during batch selection.
UPDATE spg_question_rehab_reviews
SET batch_id='RPSGT-REHAB-2026-11-09-P25-B5',
    priority=1,
    review_state=CASE WHEN review_state='queued' THEN 'pilot-triage'
                      ELSE review_state END,
    review_notes=CASE WHEN review_state='queued'
         THEN 'Batch 5 intake: exact BRPT mapping, primary-source passages, AASM V3 when relevant, final APA 7 and explicit owner approval required. No learner-facing changes.'
         ELSE review_notes END,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (
    'RPSGT-B3-C003',
    'RPSGT-B4-R082',
    'RPSGT-B6-S109',
    'RPSGT-MOCK-D1-097',
    'RPSGT-B4-R008',
    'RPSGT-B6-S105',
    'RPSGT-B2-M045',
    'RPSGT-B4-R011',
    'RPSGT-MOCK-D2-058',
    'RPSGT-B3-C051',
    'RPSGT-B3-C053',
    'RPSGT-B3-C069',
    'RPSGT-B4-R023',
    'RPSGT-B2-M084',
    'RPSGT-B2-M086',
    'RPSGT-B2-M089',
    'RPSGT-B2-M090',
    'RPSGT-B3-C104',
    'RPSGT-B4-R090',
    'RPSGT-B2-M123',
    'RPSGT-B2-M124',
    'RPSGT-B2-M129',
    'RPSGT-B3-C147',
    'RPSGT-B4-R069',
    'RPSGT-B4-R071'
)
AND review_state IN ('queued','pilot-triage','rewrite-drafted')
AND (batch_id='' OR batch_id='RPSGT-REHAB-2026-11-09-P25-B5');

-- Candidate rewrite JSON is stored only in D1 spg_question_rehab_reviews.
-- A draft or batch status must never trigger an automatic release.
