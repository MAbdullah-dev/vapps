-- 023_document_obsolete_retention.sql
-- Timestamp when a record became obsolete (for 3-year retention purge).

ALTER TABLE document_module_records
  ADD COLUMN IF NOT EXISTS obsolete_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN document_module_records.obsolete_at IS
  'Set when lifecycle_status becomes obsolete; used for automatic purge after retention period.';

CREATE INDEX IF NOT EXISTS idx_document_module_records_obsolete_at
  ON document_module_records(obsolete_at)
  WHERE lifecycle_status = 'obsolete';

-- Best-effort backfill for rows already obsolete
UPDATE document_module_records
SET obsolete_at = updated_at
WHERE lifecycle_status = 'obsolete' AND obsolete_at IS NULL;
