-- RPSGT flagged-question intake, 2026-11-08
-- Idempotent: preserves preexisting review work.
-- Run AFTER 0002_question_rehab_reviews.sql.
-- This only writes editorial review metadata, never learner-facing question records.

INSERT OR IGNORE INTO spg_question_rehab_reviews
  (question_id, program, source_content_hash, intake_reason)
SELECT question_id, program, content_hash, 'manual_review_recommended=1'
FROM spg_questions
WHERE program = 'RPSGT' AND manual_review_recommended = 1;

-- Deterministic pilot across four domains: D1=5, D2=7, D3=7, D4=6.
WITH ranked AS (
  SELECT question_id, domain,
         ROW_NUMBER() OVER (PARTITION BY domain ORDER BY question_id) AS rn
  FROM spg_questions
  WHERE program='RPSGT' AND manual_review_recommended=1
), pilot AS (
  SELECT question_id FROM ranked
  WHERE (domain='D1' AND rn<=5)
     OR (domain='D2' AND rn<=7)
     OR (domain='D3' AND rn<=7)
     OR (domain='D4' AND rn<=6)
)
UPDATE spg_question_rehab_reviews
SET batch_id='RPSGT-REHAB-2026-11-08-P25',
    priority=1,
    review_state='pilot-triage',
    review_notes='Intake only. Verify original against exact primary source passage, current BRPT task, answer, distractors, APA citations and owner approval. No learner-facing changes.',
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (SELECT question_id FROM pilot)
  AND review_state IN ('queued','pilot-triage');
