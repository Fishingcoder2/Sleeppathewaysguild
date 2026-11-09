-- Sleep Pathways Guild RPSGT V3 — flagged-question rehabilitation tracking
-- Phase: editorial review ONLY. Safe for the shadow D1 question bank.
-- Does not alter questions, answers, learner eligibility, releases, or existing editor drafts.

CREATE TABLE IF NOT EXISTS spg_question_rehab_reviews (
  question_id TEXT PRIMARY KEY REFERENCES spg_questions(question_id) ON DELETE RESTRICT,
  program TEXT NOT NULL CHECK (program IN ('RPSGT','CPSGT')),
  source_content_hash TEXT NOT NULL,
  intake_reason TEXT NOT NULL,
  batch_id TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  review_state TEXT NOT NULL DEFAULT 'queued'
    CHECK (review_state IN ('queued','pilot-triage','source-review','rewrite-drafted',
       'verification-blocked','ready-for-owner-review','owner-approved','retired')),
  editorial_action TEXT NOT NULL DEFAULT 'undetermined',
  blueprint_verification TEXT NOT NULL DEFAULT 'not-started',
  clinical_verification TEXT NOT NULL DEFAULT 'not-started',
  reference_verification TEXT NOT NULL DEFAULT 'not-started',
  proposed_draft_id TEXT,
  review_findings_json TEXT NOT NULL DEFAULT '{}',
  review_notes TEXT NOT NULL DEFAULT '',
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  proposed_rewrite_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spg_question_rehab_batch
  ON spg_question_rehab_reviews(batch_id, review_state, priority);

-- CAUTION: There is no automatic promotion from this table.
-- Publishing still requires the existing owner-approved question-release workflow.
