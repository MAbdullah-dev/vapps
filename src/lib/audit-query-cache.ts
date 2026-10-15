import type { QueryClient } from "@tanstack/react-query";
import { getDashboardPath } from "@/lib/subdomain";

/** React Query keys used by the audit list and plan detail screens. */
export const AUDIT_PLANS_QUERY_KEY = "auditPlans";
export const AUDIT_PLAN_QUERY_KEY = "auditPlan";

export function auditTableHref(orgId: string): string {
  return getDashboardPath(orgId, "audit");
}

/** Refresh the audit table (and related plan caches) after a workflow action. */
export async function invalidateAuditCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [AUDIT_PLANS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AUDIT_PLAN_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: ["auditPlanFindings"] }),
  ]);
}
