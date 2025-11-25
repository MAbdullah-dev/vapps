import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function OrgDashboardLayout({ children }: any) {
    return (
        <div className="flex min-h-screen bg-[#f9f9f9]">

            <Sidebar orgId="abc"/>

            <div className="flex-1 flex flex-col">

                <Topbar />

                <main className="p-6 w-full bg-[#F9F9F9] flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
