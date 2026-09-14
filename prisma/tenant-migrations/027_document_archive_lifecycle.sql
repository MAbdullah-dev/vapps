-- 027_document_archive_lifecycle.sql
-- Superseded versions are archived when a new revision becomes active,
-- then marked obsolete after 3 years.

ALTER TABLE document_module_records
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN document_module_records.archived_at IS
  'Set when a newer approved revision supersedes this record; obsolete after 3 years.';

ALTER TABLE document_module_records
  DROP CONSTRAINT IF EXISTS document_module_records_lifecycle_status_check;

ALTER TABLE document_module_records
  ADD CONSTRAINT document_module_records_lifecycle_status_check
  CHECK (lifecycle_status IN ('active', 'archived', 'obsolete'));

CREATE INDEX IF NOT EXISTS idx_document_module_records_archived_at
  ON document_module_records(archived_at)
  WHERE lifecycle_status = 'archived';

-- Recent superseded rows that were marked obsolete immediately become archived.
UPDATE document_module_records
SET lifecycle_status = 'archived',
    archived_at = COALESCE(obsolete_at, updated_at),
    obsolete_at = NULL
WHERE lifecycle_status = 'obsolete'
  AND superseded_by_record_id IS NOT NULL
  AND COALESCE(obsolete_at, updated_at) >= NOW() - INTERVAL '3 years';

-- Older superseded obsolete rows keep obsolete status; record when they were archived.
UPDATE document_module_records
SET archived_at = COALESCE(archived_at, obsolete_at, updated_at)
WHERE lifecycle_status = 'obsolete'
  AND superseded_by_record_id IS NOT NULL
  AND archived_at IS NULL;
