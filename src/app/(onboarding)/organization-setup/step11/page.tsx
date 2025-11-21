"use client";

import { CheckCircle } from "lucide-react";

const step11 = () => {
    // const router = useRouter();
    return (
        <div className="container mx-auto px-5 space-y-10">

            {/* Setup Complete Box */}
            <div className="flex flex-col  items-center gap-4 bg-[#DCFCE7] p-6 rounded-lg">
                <CheckCircle size={40} className="text-green-600" />
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Setup Complete!</h1>
                    <p className="text-gray-700">Review your configuration before finalizing the setup</p>
                </div>
            </div>

            {/* Company Information Box */}
            <div className="border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Company Information</h2>
                <div className="grid grid-cols-1  gap-4">
                    <p className="flex justify-between"><span className="font-medium">Company Name:</span> <span>Not set</span></p>
                    <p className="flex justify-between"><span className="font-medium">Registration ID:</span> <span>Not set</span></p>
                    <p className="flex justify-between"><span className="font-medium">Industry:</span> <span>Not set</span></p>
                    <p className="flex justify-between"><span className="font-medium">Contact Email:</span> <span>Not set</span></p>
                </div>
            </div>

            {/* Configuration Summary Box */}
            <div className="border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Configuration Summary</h2>

                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <span>Sites & Processes</span>
                        <span className="text-[#432DD7] bg-[#E0E7FF] px-2 py-1 rounded-full text-sm">0 sites</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Leadership Team</span>
                        <span className="text-[#432DD7] bg-[#E0E7FF] px-2 py-1 rounded-full text-sm">0 leaders</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Users & Roles</span>
                        <span className="text-[#432DD7] bg-[#E0E7FF] px-2 py-1 rounded-full text-sm">0 users</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Products & Inventory</span>
                        <span className="text-[#432DD7] bg-[#E0E7FF] px-2 py-1 rounded-full text-sm">0 products</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Customers</span>
                        <span className="text-[#432DD7] bg-[#E0E7FF] px-2 py-1 rounded-full text-sm">0 customers</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Vendors</span>
                        <span className="text-[#432DD7] bg-[#E0E7FF] px-2 py-1 rounded-full text-sm">0 vendors</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Dashboard Widgets</span>
                        <span className="text-[#432DD7] bg-[#E0E7FF] px-2 py-1 rounded-full text-sm">0 widgets</span>
                    </div>
                </div>
            </div>

            <div className="border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Security Settings</h2>
                <div className="grid grid-cols-1 gap-4">
                    <p className="flex justify-between"><span>Two-Factor Authentication:</span> <span><span className="text-red-500">✗ </span>Disabled</span></p>
                    <p className="flex justify-between"><span>Audit Logging:</span> <span>✓ Enabled</span></p>
                    <p className="flex justify-between"><span>Backup Frequency:</span> <span>Daily</span></p>
                </div>
            </div>


            {/* Final Note */}
            <p className="text-[#432DD7] bg-[#E0E7FF] px-2 py-4 rounded-sm text-sm">
                Click <span className="font-medium">"Finish Setup"</span> to create your workspace. You can modify these settings anytime from the Settings page.
            </p>
            
        </div>
    );
}

export default step11