import SettingSidebar from "@/components/dashboard/SettingSidebar";
import SettingsAccessGuard from "@/components/dashboard/SettingsAccessGuard";
import React from "react";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsAccessGuard>
      <div className="flex h-full">
        <SettingSidebar />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </SettingsAccessGuard>
  );
}
