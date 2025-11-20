"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/common/Header";
import StepProgress from "@/components/common/StepProgress";
import StepTabs from "@/components/common/StepTabs";
import OnboardingFooter from "@/components/common/OnboardingFooter";

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

      <div className="container mx-auto px-5 py-10">{children}</div>

      <OnboardingFooter currentStep={currentStep} totalSteps={totalSteps} />
    </>
  );
}
