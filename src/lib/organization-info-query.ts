/** React Query key for tenant organization profile (name, logo, etc.). */
export function organizationInfoQueryKey(orgId: string) {
  return ["organizationInfo", orgId] as const;
}
