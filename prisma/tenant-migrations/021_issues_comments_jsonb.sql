-- Persist issue thread comments (JSON array) for the issues workspace dialog.
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "comments" JSONB NOT NULL DEFAULT '[]'::jsonb;
