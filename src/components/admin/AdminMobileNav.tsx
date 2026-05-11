"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, LayoutDashboard, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { tab: "overview", label: "Overview", icon: LayoutDashboard },
  { tab: "organizations", label: "Orgs", icon: Building2 },
  { tab: "users", label: "Users", icon: Users },
  { tab: "audit", label: "Audit", icon: Shield },
] as const;

export default function AdminMobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("tab") ?? "overview";
  const onAdmin =
    pathname === "/admin" || pathname.startsWith("/admin/");

  if (!onAdmin) return null;

  return (
    <nav className="md:hidden border-b border-border bg-muted/40 px-2 py-2">
      <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
        {items.map(({ tab, label, icon: Icon }) => {
          const active = current === tab;
          return (
            <Link
              key={tab}
              href={`/admin?tab=${tab}`}
              prefetch
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:bg-background/80"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
