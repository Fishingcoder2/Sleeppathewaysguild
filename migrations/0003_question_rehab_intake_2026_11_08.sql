-- RPSGT flagged-question intake, 2026-11-08 (balanced 25-item pilot)
-- Idempotent, source-preserving. Run AFTER 0002_question_rehab_reviews.sql.
-- No change to spg_questions, question eligibility, versions, or releases.

INSERT OR IGNORE INTO spg_question_rehab_reviews
  (question_id, program, source_content_hash, intake_reason)
SELECT question_id, program, content_hash, 'manual_review_recommended=1'
FROM spg_questions
WHERE program = 'RPSGT' AND manual_review_recommended = 1;

-- Cover ALL twelve current BRPT task categories, plus one unresolved
-- D2A/D2C cross-task mapping, without modifying the underlying task assignment.
-- D1=5, D2=7, D3=7, D4=6. Three already drafted source IDs are retained.

-- Restore only unworked items removed from a previous preliminary pilot.
UPDATE spg_question_rehab_reviews
SET batch_id='', priority=3, review_state='queued',
    editorial_action='undetermined', review_findings_json='{}',
    review_notes='', updated_at=CURRENT_TIMESTAMP
WHERE batch_id='RPSGT-REHAB-2026-11-08-P25'
  AND review_state='pilot-triage'
  AND question_id NOT IN (
    'RPSGT-B2-M003','RPSGT-B2-M008','RPSGT-B2-M020','RPSGT-B2-M023','RPSGT-B2-M024',
    'RPSGT-B2-M038','RPSGT-B2-M041','RPSGT-B2-M048','RPSGT-B2-M049',
    'RPSGT-B2-M063','RPSGT-B2-M064','RPSGT-MOCK-D2-051',
    'RPSGT-B2-M072','RPSGT-B2-M073','RPSGT-B2-M074','RPSGT-B3-C099','RPSGT-B3-C101',
    'RPSGT-B2-M101','RPSGT-B2-M102','RPSGT-B2-M110','RPSGT-B2-M112',
    'RPSGT-B2-M138','RPSGT-B2-M140','RPSGT-B2-M146','RPSGT-B2-M147'
  );

-- Staging only; never mark items learner-eligible based on a review state.
UPDATE spg_question_rehab_reviews
SET batch_id='RPSGT-REHAB-2026-11-08-P25', priority=1,
    review_state=CASE WHEN review_state='queued' THEN 'pilot-triage'
                      ELSE review_state END,
    review_notes=CASE WHEN review_state='queued'
                 THEN 'Pilot intake only. Verify exact BRPT subtask, direct current clinical sources, rationale, distractors, and APA citations before owner approval. Not learner-facing.'
                 ELSE review_notes END,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (
    'RPSGT-B2-M003','RPSGT-B2-M008','RPSGT-B2-M020','RPSGT-B2-M023','RPSGT-B2-M024',
    'RPSGT-B2-M038','RPSGT-B2-M041','RPSGT-B2-M048','RPSGT-B2-M049',
    'RPSGT-B2-M063','RPSGT-B2-M064','RPSGT-MOCK-D2-051',
    'RPSGT-B2-M072','RPSGT-B2-M073','RPSGT-B2-M074','RPSGT-B3-C099','RPSGT-B3-C101',
    'RPSGT-B2-M101','RPSGT-B2-M102','RPSGT-B2-M110','RPSGT-B2-M112',
    'RPSGT-B2-M138','RPSGT-B2-M140','RPSGT-B2-M146','RPSGT-B2-M147'
  ) AND review_state IN ('queued','pilot-triage','rewrite-drafted');
