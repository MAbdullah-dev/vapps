-- 021_document_module_revision_lifecycle.sql
-- Adds lifecycle and version-link fields to support Edit/View + Revision flow.

ALTER TABLE document_module_records
  ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS supersedes_record_id UUID NULL,
  ADD COLUMN IF NOT EXISTS superseded_by_record_id UUID NULL;

ALTER TABLE document_module_records
  DROP CONSTRAINT IF EXISTS document_module_records_lifecycle_status_check;

ALTER TABLE document_module_records
  ADD CONSTRAINT document_module_records_lifecycle_status_check
  CHECK (lifecycle_status IN ('active', 'obsolete'));

CREATE INDEX IF NOT EXISTS idx_document_module_records_lifecycle_status
  ON document_module_records(lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_document_module_records_supersedes_record_id
  ON document_module_records(supersedes_record_id);

CREATE INDEX IF NOT EXISTS idx_document_module_records_superseded_by_record_id
  ON document_module_records(superseded_by_record_id);

