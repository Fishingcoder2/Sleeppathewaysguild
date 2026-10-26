-- Sleep Pathways Guild canonical question-bank schema
-- Phase 1: non-breaking D1 source-of-truth foundation.
-- Existing webapps continue using their current static banks until parity gates pass.

CREATE TABLE IF NOT EXISTS spg_questions (
  question_id TEXT PRIMARY KEY,
  program TEXT NOT NULL CHECK (program IN ('RPSGT','CPSGT')),
  domain TEXT NOT NULL,
  task_code TEXT NOT NULL,
  task_label TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL,
  answer TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  distractor_rationales_json TEXT NOT NULL DEFAULT '{}',
  reference_keys_json TEXT NOT NULL DEFAULT '[]',
  study_recommendation_keys_json TEXT NOT NULL DEFAULT '[]',
  source_credit_json TEXT NOT NULL DEFAULT '{}',
  qa_json TEXT NOT NULL DEFAULT '{}',
  publication_status TEXT NOT NULL DEFAULT 'published-learner-eligible',
  manual_review_recommended INTEGER NOT NULL DEFAULT 0 CHECK (manual_review_recommended IN (0,1)),
  learner_excluded INTEGER NOT NULL DEFAULT 0 CHECK (learner_excluded IN (0,1)),
  review_status TEXT NOT NULL DEFAULT 'active',
  content_hash TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'github-static-bank',
  revision_of TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spg_questions_program_domain_task
  ON spg_questions(program, domain, task_code);
CREATE INDEX IF NOT EXISTS idx_spg_questions_program_active
  ON spg_questions(program, active, learner_excluded);
CREATE INDEX IF NOT EXISTS idx_spg_questions_content_hash
  ON spg_questions(program, content_hash);

CREATE TABLE IF NOT EXISTS spg_question_eligibility (
  question_id TEXT PRIMARY KEY REFERENCES spg_questions(question_id) ON DELETE CASCADE,
  practice_eligible INTEGER NOT NULL DEFAULT 0 CHECK (practice_eligible IN (0,1)),
  readiness_eligible INTEGER NOT NULL DEFAULT 0 CHECK (readiness_eligible IN (0,1)),
  mock_eligible INTEGER NOT NULL DEFAULT 0 CHECK (mock_eligible IN (0,1)),
  report_resolvable INTEGER NOT NULL DEFAULT 1 CHECK (report_resolvable IN (0,1)),
  lms_sync_eligible INTEGER NOT NULL DEFAULT 0 CHECK (lms_sync_eligible IN (0,1)),
  exclusion_reason TEXT NOT NULL DEFAULT '',
  duplicate_family TEXT NOT NULL DEFAULT '',
  eligibility_version TEXT NOT NULL DEFAULT '2026-10-26',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spg_question_eligibility_lms
  ON spg_question_eligibility(lms_sync_eligible, question_id);
CREATE INDEX IF NOT EXISTS idx_spg_question_eligibility_duplicate
  ON spg_question_eligibility(duplicate_family);

CREATE TABLE IF NOT EXISTS spg_question_versions (
  version_id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES spg_questions(question_id) ON DELETE RESTRICT,
  version_no INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  source_system TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(question_id, version_no)
);

CREATE TABLE IF NOT EXISTS spg_question_releases (
  release_id TEXT PRIMARY KEY,
  program TEXT NOT NULL CHECK (program IN ('RPSGT','CPSGT')),
  source_count INTEGER NOT NULL DEFAULT 0,
  effective_count INTEGER NOT NULL DEFAULT 0,
  release_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('staged','validated','published','superseded','rolled-back')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS spg_question_sync_runs (
  sync_id TEXT PRIMARY KEY,
  program TEXT NOT NULL CHECK (program IN ('RPSGT','CPSGT')),
  target TEXT NOT NULL CHECK (target IN ('RPSGT-V2','RPSGT-V3','CPSGT-WEBAPP','LMS-D2')),
  source_release_id TEXT NOT NULL DEFAULT '',
  expected_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  mismatch_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('staged','validated','blocked','published')),
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
