import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin-access";

export async function requireAdminTenantConnection(req: NextRequest, orgId: string) {
  const admin = await getAdminUser(req);
  if (!admin) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { database: true },
  });
  if (!org) {
    return { ok: false as const, status: 404, error: "Organization not found" };
  }

  const connectionString = org.database?.connectionString;
  if (!connectionString) {
    return { ok: false as const, status: 404, error: "Tenant database not found" };
  }

  return {
    ok: true as const,
    admin,
    organization: org,
    connectionString,
  };
}
