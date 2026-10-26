-- Preserve exact source question payloads so D1 can serve every app-specific field.
ALTER TABLE spg_questions ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}';
