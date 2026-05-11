"use client";

import { ReactNode, Suspense } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";
import AdminTopbar from "@/components/admin/AdminTopbar";

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex w-[260px] border-r border-border bg-card min-h-screen flex-col animate-pulse" />
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <Suspense fallback={<SidebarSkeleton />}>
        <AdminSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar />
        <Suspense fallback={null}>
          <AdminMobileNav />
        </Suspense>
        <main className="p-4 md:p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
