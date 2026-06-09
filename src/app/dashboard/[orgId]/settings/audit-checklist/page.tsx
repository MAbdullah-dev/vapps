"use client";

import Link from "next/link";
import { useTranslate } from "@/components/providers/translation-provider";
import { getAdminPortalDashboardUrl } from "@/lib/super-admin-policy";

export default function AuditChecklistMovedPage() {
  const { t } = useTranslate();
  const adminChecklistsUrl = `${getAdminPortalDashboardUrl()}?tab=audit-checklists`;

  return (
    <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        {t("Audit checklist management has moved")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t(
          "Audit checklists are now managed by platform administrators in the admin portal. Your organization can still use checklists when creating audits."
        )}
      </p>
      <Link
        href={adminChecklistsUrl}
        className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("Open admin portal — Audit Checklists")}
      </Link>
    </div>
  );
}
