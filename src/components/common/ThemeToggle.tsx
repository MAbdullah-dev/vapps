"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;

    const maxAge = 60 * 60 * 24 * 365; // 1 year
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
    const host = window.location.hostname.toLowerCase();
    const derivedDomain =
      !rootDomain &&
      host.includes(".") &&
      host !== "localhost" &&
      !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)
        ? host.split(".").slice(-2).join(".")
        : undefined;
    const shareDomain = rootDomain || derivedDomain;
    const domainPart =
      shareDomain && (host === shareDomain || host.endsWith(`.${shareDomain}`))
        ? `; Domain=.${shareDomain}`
        : "";

    // Keep a shared cookie so auth/dashboard subdomains can read same preference.
    document.cookie = `vie-theme=${encodeURIComponent(
      resolvedTheme
    )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainPart}${secure}`;
  }, [mounted, resolvedTheme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      disabled={!mounted}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {!mounted ? <Moon size={18} /> : resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
