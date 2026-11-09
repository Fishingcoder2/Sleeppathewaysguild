-- Sleep Pathways Guild RPSGT — rehabilitation batch 2
-- Repeatable editorial-intake only. Requires migrations 0001–0003.
-- Does not update original questions, versions, learner eligibility, or releases.
INSERT OR IGNORE INTO spg_question_rehab_reviews
    (question_id,program,source_content_hash,intake_reason)
SELECT question_id,program,content_hash,'manual_review_recommended=1'
FROM spg_questions
WHERE program='RPSGT' AND manual_review_recommended=1;

-- 25 selected questions; all 12 BRPT task categories + one unresolved D2A/D2C.
-- D1=6; D2=7; D3=6; D4=6.
-- Candidates already drafted retain their draft status. No automatic publication.
UPDATE spg_question_rehab_reviews
SET batch_id='RPSGT-REHAB-2026-11-09-P25-B2',
    priority=1,
    review_state=CASE WHEN review_state='queued' THEN 'pilot-triage' ELSE review_state END,
    review_notes=CASE WHEN review_state='queued'
      THEN 'Batch 2 editorial intake; independently verify applicable primary standards, BRPT subtask, detailed rationales, APA 7 citations and owner approval.'
      ELSE review_notes END,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (
    '101',
    'RPSGT-B2-M014',
    'RPSGT-B3-C017',
    'RPSGT-B3-C020',
    'RPSGT-B2-M026',
    'RPSGT-B3-C023',
    'RPSGT-B2-M040',
    'RPSGT-B2-M042',
    'RPSGT-MOCK-D2-053',
    'RPSGT-B2-M050',
    'RPSGT-B2-M051',
    'RPSGT-B2-M065',
    'RPSGT-B2-M070',
    'RPSGT-B2-M075',
    'RPSGT-B2-M076',
    'RPSGT-B2-M077',
    'RPSGT-MOCK-D3-086',
    'RPSGT-B2-M103',
    'RPSGT-B2-M104',
    'RPSGT-B2-M111',
    'RPSGT-B2-M115',
    'RPSGT-B2-M141',
    'RPSGT-B3-C139',
    'RPSGT-B2-M148',
    'RPSGT-B2-M149'
)
  AND review_state IN ('queued','pilot-triage','rewrite-drafted')
  AND (batch_id='' OR batch_id='RPSGT-REHAB-2026-11-09-P25-B2');

-- Review metadata and draft text are stored in the D1 review table.
-- A publication or clinical-approval process must never be implied by this migration.
