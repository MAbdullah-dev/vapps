import type { PoolClient } from "pg";

/** Idempotent: some tenant DBs may not have run SQL migrations yet. */
export async function ensureIssueCommentsColumn(client: PoolClient) {
  await client.query(
    `ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "comments" JSONB NOT NULL DEFAULT '[]'::jsonb`
  );
}
