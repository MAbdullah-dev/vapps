-- 020_document_module_records.sql
-- Persists document module create/revise/obsolete submissions and drafts.

CREATE TABLE IF NOT EXISTS document_module_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'submitted')),
  preview_doc_ref TEXT NOT NULL,
  form_data JSONB NOT NULL,
  wizard_data JSONB NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_by_user_name TEXT NULL,
  updated_by_user_id TEXT NOT NULL,
  updated_by_user_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_module_records_status
  ON document_module_records(status);

CREATE INDEX IF NOT EXISTS idx_document_module_records_created_at
  ON document_module_records(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_module_records_updated_at
  ON document_module_records(updated_at DESC);
