"use client";

import BrandLogo from "@/components/common/BrandLogo";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, FileCheck, LayoutDashboard, Shield, Users } from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const onAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  const isActive = (tab: string) => onAdminRoute && activeTab === tab;

  return (
    <aside className="hidden md:flex w-[260px] border-r border-border bg-card text-card-foreground min-h-screen flex-col">
      <div className="border-b border-border p-5">
        <BrandLogo className="mb-2" alt="Vie Admin" width={95} height={40} />
        <p className="text-xs text-muted-foreground">Platform Admin</p>
      </div>

      <nav className="p-4 space-y-1">
        <Link
          href="/admin?tab=overview"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            isActive("overview")
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <LayoutDashboard size={16} />
          Overview
        </Link>

        <Link
          href="/admin?tab=organizations"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            isActive("organizations")
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <Building2 size={16} />
          Organizations
        </Link>

        <Link
          href="/admin?tab=users"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            isActive("users")
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <Users size={16} />
          Users
        </Link>

        <Link
          href="/admin?tab=audit-checklists"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            isActive("audit-checklists")
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <FileCheck size={16} />
          Audit Checklists
        </Link>

        <Link
          href="/admin?tab=audit"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            isActive("audit")
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <Shield size={16} />
          Audit Logs
        </Link>
      </nav>
    </aside>
  );
}
