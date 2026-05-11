"use client";

import { CheckCircle } from "lucide-react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";

const Step10 = () => {
  const router = useRouter();
  const data = useOnboardingStore((s) => s.data);
  const reset = useOnboardingStore((s) => s.reset);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    // Validate required data
    if (!data.step1?.companyName || data.step1.companyName.trim().length === 0) {
      setError("Company name is required. Please go back to step 1 and provide a company name.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/organization/create", data);
      const result = response.data;

      // Success - redirect to home page
      reset(); // Clear onboarding data
      router.push("/");
    } catch (err: any) {
      console.error("Error creating organization:", err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "An unexpected error occurred. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto space-y-10 px-5 text-foreground">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-muted p-6">
        <CheckCircle size={40} className="text-green-600" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Setup Complete!</h1>
          <p className="text-muted-foreground">Review your configuration before finalizing the setup</p>
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Company Information</h2>
        <div className="grid grid-cols-1  gap-4">
          <p className="flex justify-between"><span className="font-medium">Company Name:</span> <span>{data.step1?.companyName || "Not set"}</span></p>
          <p className="flex justify-between"><span className="font-medium">Registration ID:</span> <span>{data.step1?.registrationId || "Not set"}</span></p>
          <p className="flex justify-between"><span className="font-medium">Industry:</span> <span>{data.step1?.industry || "Not set"}</span></p>
          <p className="flex justify-between"><span className="font-medium">Contact Email:</span> <span>{data.step1?.contactEmail || "Not set"}</span></p>
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Configuration Summary</h2>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span>Sites & Processes</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-sm text-secondary-foreground">{(data.step2?.sites ?? []).length} sites</span>
          </div>

          <div className="flex justify-between items-center">
            <span>Leadership Team</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-sm text-secondary-foreground">{(data.step3?.leaders ?? []).length} leaders</span>
          </div>

          <div className="flex justify-between items-center">
            <span>Products & Inventory</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-sm text-secondary-foreground">{(data.step5?.products ?? []).length} products</span>
          </div>

          <div className="flex justify-between items-center">
            <span>Customers</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-sm text-secondary-foreground">{(data.step6?.customers ?? []).length} customers</span>
          </div>

          <div className="flex justify-between items-center">
            <span>Vendors</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-sm text-secondary-foreground">{(data.step6?.vendors ?? []).length} vendors</span>
          </div>

          <div className="flex justify-between items-center">
            <span>Dashboard Widgets</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-sm text-secondary-foreground">
              {Object.values(data.step8?.widgets ?? {}).filter(Boolean).length} widgets
            </span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Security Settings</h2>
        <div className="grid grid-cols-1 gap-4">
          <p className="flex justify-between"><span>Two-Factor Authentication:</span> <span>{data.step9?.require2FA ? "✓ Enabled" : <span className="text-red-500">✗ Disabled</span>}</span></p>
          <p className="flex justify-between"><span>Audit Logging:</span> <span>{data.step9?.logAllActions ? "✓ Enabled" : "✗ Disabled"}</span></p>
          <p className="flex justify-between"><span>Backup Frequency:</span> <span>{data.step9?.backupFrequency || "Daily"}</span></p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button 
          onClick={finish} 
          disabled={isLoading}
        >
          {isLoading ? "Creating Organization..." : "Finish Setup"}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => reset()}
          disabled={isLoading}
        >
          Reset
        </Button>
      </div>

      <p className="rounded-sm bg-muted px-2 py-4 text-sm text-muted-foreground">
        Click <span className="font-medium">"Finish Setup"</span> to create your workspace. You can modify these settings anytime from the Settings page.
      </p>
    </div>
  );
};

export default Step10;
