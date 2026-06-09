import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin-access";
import { getAdminAppUrl, getMainAppUrl, isAdminHostFromHost } from "@/lib/app-hosts";
import { getLoginUrlForHost } from "@/lib/domain-auth";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const host = (await headers()).get("host") ?? "";
  const onAdminHost = isAdminHostFromHost(host);

  if (!session?.user?.email) {
    redirect(onAdminHost ? "/auth?callbackUrl=/admin" : `${getAdminAppUrl()}/auth?callbackUrl=/admin`);
  }

  if (session.user.isBlocked) {
    redirect(getLoginUrlForHost(host));
  }

  // Admin dashboard is only accessible on the admin platform host with super_admin role
  if (!session.user.id || !(await isSuperAdmin(session.user.id))) {
    redirect(getMainAppUrl());
  }

  if (!onAdminHost && process.env.NEXT_PUBLIC_ADMIN_URL?.trim()) {
    redirect(`${getAdminAppUrl()}/admin`);
  }

  return <AdminShell>{children}</AdminShell>;
}