import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import type { RequestContext } from "@/lib/request-context";
import { normalizeRole, type Role } from "@/lib/roles";
import {
  PROCESS_ACCESS_DENIED_MESSAGE,
  resolveOrgOwner,
  userHasProcessAccess,
} from "@/lib/process-access";

const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
};

/** Roles allowed to manage org-wide audit configuration / dashboards. */
export const AUDIT_MANAGER_ROLES: Role[] = ["owner", "admin", "manager"];

/** Roles allowed to change org-wide widget / metadata config. */
export const ORG_CONFIG_ROLES: Role[] = ["owner", "admin", "manager"];

export function roleMeetsMinimum(userRole: string, minimum: Role): boolean {
  const role = normalizeRole(userRole);
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function roleIsOneOf(userRole: string, allowed: Role[]): boolean {
  const role = normalizeRole(userRole);
  return allowed.includes(role);
}

export function forbiddenRoleResponse(
  message = "You do not have permission to perform this action."
): NextResponse {
  return NextResponse.json({ error: "Forbidden", message }, { status: 403 });
}

/**
 * Require the caller's tenant role to be one of the allowed roles.
 * Returns a 403 response when denied; otherwise null.
 */
export function requireOrgRoles(
  ctx: RequestContext,
  allowed: Role[],
  message?: string
): NextResponse | null {
  if (!roleIsOneOf(ctx.tenant.userRole, allowed)) {
    return forbiddenRoleResponse(message);
  }
  return null;
}

/**
 * Require process assignment (or org owner/admin).
 * Caller must already hold an open tenant client.
 */
export async function requireProcessAccess(
  client: PoolClient,
  ctx: RequestContext,
  processId: string
): Promise<NextResponse | null> {
  const isOwner = await resolveOrgOwner(ctx.tenant.orgId, ctx.user.id);
  const elevated =
    isOwner ||
    roleIsOneOf(ctx.tenant.userRole, ["owner", "admin"]);
  const allowed = await userHasProcessAccess(
    client,
    ctx.user.id,
    processId,
    elevated
  );
  if (!allowed) {
    return NextResponse.json(
      { error: PROCESS_ACCESS_DENIED_MESSAGE },
      { status: 403 }
    );
  }
  return null;
}

/** Safe client error message — never leak stack / SQL internals to browsers. */
export function publicErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}
