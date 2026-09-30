import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardScrollLock from "@/components/dashboard/DashboardScrollLock";
import { getOrgBySlugOrId } from "@/lib/org-utils";
import { OrgProvider } from "@/components/providers/org-provider";

/**
 * Dashboard layout for /dashboard/[orgSlug] (param is orgId in route segment, value is slug when using subdomain).
 * Organization validation happens here: if slug/org does not exist, return notFound().
 */
export default async function OrgDashboardLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ orgId: string }>;
}) {
    const { orgId: slugOrId } = await params;
    const org = await getOrgBySlugOrId(slugOrId);
    if (!org) notFound();

    return (
        <OrgProvider orgId={org.id} slug={org.slug}>
            <DashboardScrollLock />
            <div className="fixed inset-0 flex overflow-hidden bg-background">
                <Sidebar orgId={org.id} slug={org.slug} />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <Topbar />
                    <main className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
                        {children}
                    </main>
                </div>
            </div>
        </OrgProvider>
    );
}
