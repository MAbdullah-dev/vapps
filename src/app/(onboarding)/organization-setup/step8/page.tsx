"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const step8 = () => {
    const router = useRouter();
    return (
          <>
            <div className="container mx-auto px-5">
                <div className="innner">
                    <h1 className="text-2xl font-bold mb-6">Step 8</h1>

                    <div className="fields p-6 rounded-2xl border border-[#0000001A]"></div>

                    <div className="flex justify-between mt-10">
                        <Button onClick={() => router.push("/organization-setup/step7")} variant="outline"><ArrowLeft className="mr-2" /> Previous</Button>

                        <div className="flex gap-4">
                            <Button variant="secondary" onClick={() => router.push("/organization-setup/step9")}>Skip</Button>
                            <Button onClick={() => router.push("/organization-setup/step9")} variant="default">Next <ArrowRight className="ml-2" /></Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default step8