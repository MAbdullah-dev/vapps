-- 022_document_workflow_history.sql
-- Adds workflow state + immutable history log for document lifecycle actions.

ALTER TABLE document_module_records
  ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS approved_by_user_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS approved_by_user_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL;

ALTER TABLE document_module_records
  DROP CONSTRAINT IF EXISTS document_module_records_workflow_status_check;

ALTER TABLE document_module_records
  ADD CONSTRAINT document_module_records_workflow_status_check
  CHECK (workflow_status IN ('draft', 'in_review', 'in_approval', 'approved'));

CREATE INDEX IF NOT EXISTS idx_document_module_records_workflow_status
  ON document_module_records(workflow_status);

CREATE TABLE IF NOT EXISTS document_module_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES document_module_records(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_user_name TEXT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_module_history_record_id
  ON document_module_history(record_id, created_at DESC);

