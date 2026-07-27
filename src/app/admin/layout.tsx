import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { buildAuthOptions } from "@/lib/auth";
import { getRequestHost } from "@/lib/auth-cookies";
import { isSuperAdmin } from "@/lib/admin-access";
import { getAdminAppUrl, getMainAppUrl, isAdminHostFromHost } from "@/lib/app-hosts";
import { getLoginUrlForHost } from "@/lib/domain-auth";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const host = getRequestHost(await headers());
  const onAdminHost = isAdminHostFromHost(host);
  const session = await getServerSession(buildAuthOptions(host));

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