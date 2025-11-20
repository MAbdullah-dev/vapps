"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Step1() {
  const router = useRouter();

  return (
    <>
      <div className="container mx-auto px-5">
        <div className="innner">
          <h1 className="text-2xl font-bold mb-6">Step 1</h1>

          <div className="fields p-6 rounded-2xl border border-[#0000001A]"></div>

          <div className="flex justify-end mt-10">
            <Button variant="default" onClick={() => router.push("/organization-setup/step2")}> Next <ArrowRight className="ml-2" /></Button>
          </div>
        </div>
      </div>
    </>
  );
}
