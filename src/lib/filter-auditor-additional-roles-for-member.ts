import type { PoolClient } from "pg";
import { withTenantConnection } from "@/lib/db/connection-helper";
import type { Role } from "@/lib/roles";
import { AUDITOR_ADDITIONAL_ROLE_NAME } from "@/lib/auditor-leadership-policy";

async function additionalRolesTableExists(client: PoolClient): Promise<boolean> {
  const tbl = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_additional_roles'`
  );
  return tbl.rows.length > 0;
}

/** Member / Support users cannot hold Auditor. Remove leftover assignments (e.g. after a job-title change). */
export async function removeAuditorAdditionalRoleForUser(
  connectionString: string,
  userId: string
): Promise<void> {
  await withTenantConnection(connectionString, async (client) => {
    if (!(await additionalRolesTableExists(client))) return;
    await client.query(
      `DELETE FROM user_additional_roles uar
       USING additional_roles ar
       WHERE uar.additional_role_id = ar.id
         AND uar.user_id::text = $1
         AND LOWER(TRIM(ar.name)) = LOWER(TRIM($2))`,
      [userId, AUDITOR_ADDITIONAL_ROLE_NAME]
    );
  });
}

/** Member (Support leadership) users must not be assigned the Auditor additional role. */
export async function filterAdditionalRoleIdsExcludingAuditorForMember(
  connectionString: string,
  normalizedRole: Role,
  roleIds: string[]
): Promise<string[]> {
  if (normalizedRole !== "member" || roleIds.length === 0) return roleIds;
  return withTenantConnection(connectionString, async (client) => {
    const r = await client.query<{ id: string }>(
      `SELECT id::text FROM additional_roles WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))`,
      [AUDITOR_ADDITIONAL_ROLE_NAME]
    );
    const auditorId = r.rows[0]?.id;
    if (!auditorId) return roleIds;
    return roleIds.filter((id) => id !== auditorId);
  });
}
