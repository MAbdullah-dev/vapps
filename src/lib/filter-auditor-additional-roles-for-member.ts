import { withTenantConnection } from "@/lib/db/connection-helper";
import type { Role } from "@/lib/roles";
import { AUDITOR_ADDITIONAL_ROLE_NAME } from "@/lib/auditor-leadership-policy";

export async function userHasAuditorAdditionalRole(connectionString: string, userId: string): Promise<boolean> {
  return withTenantConnection(connectionString, async (client) => {
    const tbl = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_additional_roles'`
    );
    if (tbl.rows.length === 0) return false;
    const r = await client.query(
      `SELECT 1 FROM user_additional_roles uar
       INNER JOIN additional_roles ar ON ar.id = uar.additional_role_id
       WHERE uar.user_id = $1 AND LOWER(TRIM(ar.name)) = LOWER(TRIM($2))
       LIMIT 1`,
      [userId, AUDITOR_ADDITIONAL_ROLE_NAME]
    );
    return r.rows.length > 0;
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
