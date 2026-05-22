import type { PoolClient } from "pg";

/** Idempotent: some tenant DBs may not have run SQL migrations yet (see 021 / 026). */
export async function ensureIssueWorkspaceColumns(client: PoolClient) {
  await client.query(`ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3)`);
  await client.query(`ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "siteId" TEXT`);
  await client.query(
    `ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "issuer" TEXT, ADD COLUMN IF NOT EXISTS "verifier" TEXT`
  );
  await client.query(
    `ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "comments" JSONB NOT NULL DEFAULT '[]'::jsonb`
  );
}

/** @deprecated Use ensureIssueWorkspaceColumns */
export async function ensureIssueCommentsColumn(client: PoolClient) {
  await ensureIssueWorkspaceColumns(client);
}

export async function getIssueVerificationsJoin(client: PoolClient): Promise<{
  join: string;
  select: string;
}> {
  const tableCheck = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'issue_verifications'`
  );
  if (tableCheck.rows.length === 0) {
    return { join: "", select: "" };
  }
  return {
    join: ` LEFT JOIN LATERAL (
      SELECT v."kpiScore", v."closeOutDate", v."verificationDate", v."verificationStatus"
      FROM issue_verifications v
      WHERE v."issueId" = i.id
      LIMIT 1
    ) iv ON true`,
    select: `, iv."kpiScore", iv."closeOutDate", iv."verificationDate", iv."verificationStatus"`,
  };
}

export function mapIssueRowWithVerification(r: Record<string, unknown>) {
  return {
    ...r,
    issuer: r.issuer != null ? String(r.issuer) : null,
    kpiScore: r.kpiScore != null ? Number(r.kpiScore) : null,
    closeOutDate: r.closeOutDate ?? null,
    verificationDate: r.verificationDate ?? null,
    verificationStatus: r.verificationStatus ?? null,
  };
}
