"use client";

import ThemeToggle from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AdminTopbar() {
  return (
    <header className="h-14 border-b border-border bg-background px-4 flex items-center justify-between">
      <div>
        <h1 className="text-sm font-medium text-foreground">Admin Dashboard</h1>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => signOut({ callbackUrl: "/auth" })}
        >
          <LogOut size={14} />
          Logout
        </Button>
      </div>
    </header>
  );
}
