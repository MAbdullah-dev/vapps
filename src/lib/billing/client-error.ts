import { toast } from "sonner";
import { getDashboardPath } from "@/lib/subdomain";

type ApiError = Error & {
  status?: number;
  upgradePath?: string;
};

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error;
}

/** Prefer the tenant-aware billing path over the server's /dashboard/... URL. */
export function billingSettingsHref(orgSlug: string, upgradePath?: string): string {
  const slug =
    orgSlug ||
    upgradePath?.match(/\/dashboard\/([^/]+)\//)?.[1] ||
    "";
  if (slug) return getDashboardPath(slug, "settings/billing-subscription");
  if (upgradePath) return upgradePath;
  return getDashboardPath("", "settings/billing-subscription");
}

export function toastApiError(
  error: unknown,
  fallback: string,
  orgSlug?: string
): void {
  if (!isApiError(error)) {
    toast.error(fallback);
    return;
  }

  if (error.status === 402) {
    const href = billingSettingsHref(orgSlug ?? "", error.upgradePath);
    toast.error(error.message || fallback, {
      action: {
        label: "Upgrade",
        onClick: () => {
          window.location.href = href;
        },
      },
    });
    return;
  }

  toast.error(error.message || fallback);
}
