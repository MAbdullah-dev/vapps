import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { isPlatformSuperAdmin } from "@/lib/platform-roles";

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true, isBlocked: true },
  });
  if (!user || user.isBlocked) return false;
  return isPlatformSuperAdmin(user.platformRole);
}

/** @deprecated Use isSuperAdmin(userId) — checks DB platformRole, not .env emails. */
export async function isAdminEmail(_email?: string | null): Promise<boolean> {
  return false;
}

export async function getAdminUser(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user?.id) return null;
  if (!(await isSuperAdmin(user.id))) return null;
  return user;
}
