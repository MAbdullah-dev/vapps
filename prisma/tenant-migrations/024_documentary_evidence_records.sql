-- 024_documentary_evidence_records.sql
-- Persists F-type documentary evidence capture, verification, and archive metadata (tenant DB).

CREATE TABLE IF NOT EXISTS documentary_evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_record_id UUID NOT NULL REFERENCES document_module_records(id) ON DELETE CASCADE,
  template_preview_ref TEXT NOT NULL,
  workflow_status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (workflow_status IN ('draft', 'capture_submitted', 'completed')),
  capture_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  verify_archive_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  designated_verifier_user_id TEXT NOT NULL DEFAULT '',
  designated_verifier_name TEXT NOT NULL DEFAULT '',
  support_user_id TEXT NOT NULL,
  support_user_name TEXT NULL,
  created_by_user_id TEXT NOT NULL,
  created_by_user_name TEXT NULL,
  updated_by_user_id TEXT NOT NULL,
  updated_by_user_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentary_evidence_template_record_id
  ON documentary_evidence_records(template_record_id);

CREATE INDEX IF NOT EXISTS idx_documentary_evidence_workflow_status
  ON documentary_evidence_records(workflow_status);

CREATE INDEX IF NOT EXISTS idx_documentary_evidence_created_at
  ON documentary_evidence_records(created_at DESC);
