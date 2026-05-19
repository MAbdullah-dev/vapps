"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { canAccessOrgSettings } from "@/lib/settings-access";
import { getDashboardPath } from "@/lib/subdomain";

type SettingsAccessGuardProps = {
  children: React.ReactNode;
};

export default function SettingsAccessGuard({ children }: SettingsAccessGuardProps) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.orgId as string;
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!slug || slug === "undefined") return;

    let cancelled = false;
    apiClient
      .getMyOrgMembership(slug)
      .then((data) => {
        if (cancelled) return;
        const canAccess = canAccessOrgSettings(data.leadershipTier, data.isOwner);
        setAllowed(canAccess);
        setReady(true);
        if (!canAccess) {
          router.replace(getDashboardPath(slug, "processes"));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAllowed(false);
        setReady(true);
        router.replace(getDashboardPath(slug, "processes"));
      });

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  if (!slug || slug === "undefined" || !ready || !allowed) {
    const message = ready && !allowed ? "Redirecting…" : "Loading settings…";
    return <SettingsLoadingState message={message} />;
  }

  return <>{children}</>;
}

function SettingsLoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">{message}</p>
    </div>
  );
}
