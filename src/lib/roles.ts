/**
 * Role hierarchy and permission utilities
 */

export type Role = "owner" | "admin" | "manager" | "member";

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
};

/**
 * Compare two roles and determine if the first role is higher than the second
 */
export function isRoleHigher(role1: Role, role2: Role): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Get the higher role between two roles
 */
export function getHigherRole(role1: Role, role2: Role): Role {
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2] ? role1 : role2;
}

/**
 * Validate if a role string is a valid role
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_HIERARCHY;
}

/**
 * Normalize role string to valid Role type
 */
export function normalizeRole(role: string | undefined | null, defaultRole: Role = "member"): Role {
  if (!role || !isValidRole(role)) {
    return defaultRole;
  }
  return role;
}

