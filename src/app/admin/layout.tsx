import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-access";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth?callbackUrl=/admin");
  }

  if (session.user.isBlocked) {
    redirect("/auth");
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}