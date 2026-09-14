"use client";

import { HardDrive, Upload } from "lucide-react";
import { useTranslate } from "@/components/providers/translation-provider";
import { cn } from "@/lib/utils";

export function TenantStorageBanner({
  organizationName,
  className,
}: {
  organizationName: string;
  className?: string;
}) {
  const { t } = useTranslate();

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3 p-2">
        <img
          src="/Images/aws.png"
          alt="AWS"
          width={251}
          height={150}
          className="h-10 w-auto shrink-0 object-contain dark:hidden"
        />
        <img
          src="/Images/aws-dark.png"
          alt="AWS"
          width={251}
          height={150}
          className="hidden h-10 w-auto shrink-0 object-contain dark:block"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {t("Active Tenant")}: {organizationName}
          </p>
          <p className="text-xs text-muted-foreground">{t("Organization")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:justify-center">
        <HardDrive size={18} className="text-primary" aria-hidden />
        <span className="rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary">
          {t("Shared S3")}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Upload size={18} className="text-muted-foreground" aria-hidden />
        <span className="text-sm text-muted-foreground">{t("100 MB limit")}</span>
        <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
          {t("Pro")}
        </span>
      </div>
    </div>
  );
}
