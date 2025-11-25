"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/common/Header";
import StepProgress from "@/components/multistepform/StepProgress";
import StepTabs from "@/components/multistepform/StepTabs";
import OnboardingFooter from "@/components/multistepform/OnboardingFooter";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const match = pathname.match(/step(\d+)/);
  const currentStep = match ? Number(match[1]) : 1;
  const totalSteps = 11;

  return (
    <>
      <Header />

      <StepProgress step={currentStep} total={totalSteps} />
      <StepTabs currentStep={currentStep} />

      <div className="container mx-auto px-5 py-10 border border-[#D4D4D4] rounded-2xl">
        {children}
      </div>

      <OnboardingFooter currentStep={currentStep} totalSteps={totalSteps} />
    </>
  );
}
