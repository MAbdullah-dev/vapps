"use client";

import React, { useState, useEffect, Suspense } from "react";
import Login from "@/components/Auth/Login";
import Register from "@/components/Auth/Register";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { isAdminHostFromHost } from "@/lib/app-hosts";
import { useTranslate } from "@/components/providers/translation-provider";

function AuthSuspenseFallback() {
  const { t } = useTranslate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="animate-pulse text-muted-foreground">{t("Loading...")}</div>
    </div>
  );
}

function AuthPageContent() {
  const { t } = useTranslate();
  const [isLogin, setIsLogin] = useState(true);
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const inviteEmail = searchParams.get("email");
  const callbackUrl = searchParams.get("callbackUrl");
  const isAdminHost =
    typeof window !== "undefined" && isAdminHostFromHost(window.location.host);
  const isAdminLogin =
    isAdminHost || (callbackUrl?.startsWith("/admin") ?? false);
  const resolvedCallbackUrl =
    isAdminHost && !callbackUrl ? "/admin" : callbackUrl || undefined;
  const showLogin = inviteToken || isAdminLogin ? true : isLogin;

  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "true") {
      toast.success(t("Email verified successfully!"));
    }
  }, [searchParams, t]);

  return (
    <div>
      {showLogin ? (
        <Login 
          onSwitch={() => setIsLogin(false)}
          inviteToken={inviteToken || undefined}
          inviteEmail={inviteEmail || undefined}
          callbackUrl={resolvedCallbackUrl}
          adminOnly={isAdminLogin}
        />
      ) : (
        <Register onSwitch={() => setIsLogin(true)} />
      )}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}