/** Platform-wide roles (master DB User.platformRole), not org membership roles. */
export const PLATFORM_ROLES = {
  USER: "user",
  SUPER_ADMIN: "super_admin",
} as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export function isPlatformSuperAdmin(role: string | null | undefined): boolean {
  return role === PLATFORM_ROLES.SUPER_ADMIN;
}

export function isValidPlatformRole(value: string): value is PlatformRole {
  return value === PLATFORM_ROLES.USER || value === PLATFORM_ROLES.SUPER_ADMIN;
}
