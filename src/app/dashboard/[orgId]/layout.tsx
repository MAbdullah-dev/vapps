import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function OrgDashboardLayout({ children }: any) {
    return (
        <div className="flex min-h-screen">

            {/* Sidebar */}
            <Sidebar />

            {/* Main Area */}
            <div className="flex-1 flex flex-col">

                {/* Topbar */}
                <Topbar />

                {/* Content */}
                <main className="p-6 w-full bg-[#F9F9F9] flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}
