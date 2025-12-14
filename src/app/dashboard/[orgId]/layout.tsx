import Topbar from "@/components/dashboard/Topbar";
import SidebarWrapper from "@/components/dashboard/SidebarWrapper";

export default async function OrgDashboardLayout({ 
    children, 
    params 
}: { 
    children: React.ReactNode;
    params: Promise<{ orgId: string }>;
}) {
    const { orgId } = await params;
    
    return (
        <div className="flex min-h-screen bg-[#f9f9f9]">

            <SidebarWrapper orgId={orgId}/>

            <div className="flex-1 flex flex-col">

                <Topbar />

                <main className="p-6 w-full bg-[#F9F9F9] flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
