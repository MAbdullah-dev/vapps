import { Suspense } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Loading admin dashboard…
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}