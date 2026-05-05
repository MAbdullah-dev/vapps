"use client";

import Header from "@/components/common/Header";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />

      <div className="container mx-auto px-5 py-10 border border-[#D4D4D4] rounded-2xl">
        {children}
      </div>
    </>
  );
}
