import type { PoolClient } from "pg";

/**
 * Organization owners may access any process (typically from Settings).
 * All other users must be assigned via process_users.
 */
export async function userHasProcessAccess(
  client: PoolClient,
  userId: string,
  processId: string,
  isOwner: boolean
): Promise<boolean> {
  if (isOwner) return true;

  const result = await client.query(
    `SELECT 1 FROM process_users WHERE user_id = $1 AND process_id::text = $2`,
    [userId, processId]
  );
  return result.rows.length > 0;
}

export async function getUserAssignedProcessIds(
  client: PoolClient,
  userId: string
): Promise<string[]> {
  const result = await client.query<{ process_id: string }>(
    `SELECT process_id::text AS process_id FROM process_users WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row) => row.process_id);
}

export const PROCESS_ACCESS_DENIED_MESSAGE =
  "You can only access the process you are assigned to.";

export async function resolveOrgOwner(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { ownerId: true },
  });
  return org?.ownerId === userId;
}
