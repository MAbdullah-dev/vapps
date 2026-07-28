"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSession, signIn, signOut } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import { Eye, EyeOff, Github, Apple, Chrome } from "lucide-react";

import { Turnstile } from "@marsidev/react-turnstile";

import { loginSchema, LoginInput } from "@/schemas/auth/auth.schema";
import { apiClient } from "@/lib/api-client";
import {
  getAdminPortalLoginUrl,
  getClientHost,
  getPostLoginPath,
  hasAdminPlatformAccess,
  isSuperAdminBlockedOnAppHost,
} from "@/lib/domain-auth";
import { SUPER_ADMIN_APP_LOGIN_FORBIDDEN } from "@/lib/super-admin-policy";
import { useTranslate } from "@/components/providers/translation-provider";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type LoginProps = {
  onSwitch: () => void;
  inviteToken?: string;
  inviteEmail?: string;
  callbackUrl?: string;
  adminOnly?: boolean;
};

function safeRelativeCallbackUrl(callbackUrl?: string) {
  if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//")) {
    return null;
  }
  return callbackUrl;
}

const Login = ({
  onSwitch,
  inviteToken,
  inviteEmail,
  callbackUrl,
  adminOnly = false,
}: LoginProps) => {
  const { t } = useTranslate();
  const router = useRouter();
  const safeCallbackUrl = safeRelativeCallbackUrl(callbackUrl);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const turnstileEnabled = Boolean(TURNSTILE_SITE_KEY);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: inviteEmail || "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      if (turnstileEnabled && !turnstileToken) {
        toast.error(t("Please complete the security check"));
        return;
      }

      setLoading(true);

      await apiClient.login({
        ...data,
        ...(requiresTwoFactor && twoFactorCode.trim()
          ? { twoFactorCode: twoFactorCode.trim() }
          : {}),
        ...(turnstileEnabled && turnstileToken
          ? { turnstileToken }
          : {}),
      });

      const host = getClientHost();
      const session = await getSession();

      if (adminOnly && !hasAdminPlatformAccess(session?.user?.platformRole, host)) {
        await signOut({ redirect: false });
        toast.error(t("This login is only for platform super admins."));
        router.refresh();
        return;
      }

      if (
        !adminOnly &&
        isSuperAdminBlockedOnAppHost(session?.user?.platformRole, host)
      ) {
        await signOut({ redirect: false });
        toast.error(t(SUPER_ADMIN_APP_LOGIN_FORBIDDEN));
        window.location.href = getAdminPortalLoginUrl();
        return;
      }

      toast.success(t("Logged in successfully"));

      // ✅ Redirect based on invite token
      if (inviteToken) {
        // If there's an invite token, redirect to invite page to auto-accept
        router.push(`/auth/invite?token=${inviteToken}`);
      } else {
        router.push(
          getPostLoginPath({
            host,
            platformRole: session?.user?.platformRole,
            callbackUrl: safeCallbackUrl,
          })
        );
      }
      router.refresh(); // optional but recommended for auth state update
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("Login failed");
      if (message === "TWO_FACTOR_REQUIRED") {
        setRequiresTwoFactor(true);
        if (turnstileEnabled) {
          setTurnstileToken(null);
          setTurnstileKey((k) => k + 1);
        }
        toast.info(t("Enter your authenticator code to continue"));
        return;
      }

      toast.error(message);
      if (
        message.toLowerCase().includes("verify your email") ||
        message.toLowerCase().includes("verification link")
      ) {
        setShowResendVerification(true);
        setPendingEmail(data.email);
      }
      if (turnstileEnabled) {
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) return;
    try {
      if (turnstileEnabled && !turnstileToken) {
        toast.error(t("Please complete the security check"));
        return;
      }
      setResending(true);
      const result = await apiClient.resendVerification({
        email: pendingEmail,
        ...(turnstileEnabled && turnstileToken ? { turnstileToken } : {}),
      });
      toast.success(t(result.message || "If an unverified account exists, we sent a new link."));
      if (turnstileEnabled) {
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("Could not resend verification email");
      toast.error(message);
      if (turnstileEnabled) {
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      }
    } finally {
      setResending(false);
    }
  };

  // ✅ SSO HANDLER (NO RELOAD)
  const handleSSO = async (
    provider: "google" | "github" | "apple" | "atlassian"
  ) => {
    try {
      // Preserve invite token in callback URL if present
      const host = getClientHost();
      const callbackUrl = inviteToken
        ? `/auth/invite?token=${inviteToken}`
        : getPostLoginPath({
            host,
            callbackUrl: safeCallbackUrl,
          });
      
      await signIn(provider, {
        callbackUrl,
      });
    } catch {
      toast.error(t("SSO login failed"));
    }
  };

  return (
    <div className="border border-border bg-card text-card-foreground shadow-lg p-8 rounded-2xl max-w-[400px] w-full mx-auto">
      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-xl mb-2">{t("Welcome Back")}</h1>
        {adminOnly ? (
          <p className="text-base text-muted-foreground">
            {t("Platform super admin access only")}
          </p>
        ) : inviteToken ? (
          <p className="text-base text-muted-foreground">{t("Log in to accept your invitation")}</p>
        ) : (
          <p className="text-base text-muted-foreground">{t("Login to your account")}</p>
        )}
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div className="mb-4">
          <Label className="text-sm mb-2">{t("Email")}</Label>
          <Input 
            type="email" 
            placeholder={t("Email")} 
            defaultValue={inviteEmail || ""}
            {...register("email")} 
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-4">
          <Label className="text-sm mb-2">{t("Password")}</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("Password")}
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {requiresTwoFactor && (
          <div className="mb-4">
            <Label className="text-sm mb-2">
              {t("Verification code")}
            </Label>
            <Input
              autoComplete="one-time-code"
              placeholder="123456 or XXXX-XXXX"
              value={twoFactorCode}
              onChange={(event) =>
                setTwoFactorCode(
                  event.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 9)
                )
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                "Enter your 6-digit authenticator code, or a one-time recovery code."
              )}
            </p>
          </div>
        )}

        {/* Remember + Forgot */}
        <div className="flex justify-between items-center mb-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" /> {t("Remember me")}
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            {t("Forgot password?")}
          </Link>
        </div>

        {turnstileEnabled && (
          <div className="mb-4 flex justify-center min-h-[65px]" key={turnstileKey}>
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          </div>
        )}

        {/* Submit */}
        <Button
          className="w-full"
          disabled={loading || (turnstileEnabled && !turnstileToken)}
        >
          {loading
            ? t("Logging in...")
            : requiresTwoFactor
              ? t("Verify and login")
              : t("Login")}
        </Button>

        {showResendVerification && !adminOnly && (
          <Button
            type="button"
            variant="outline"
            className="w-full mt-3"
            disabled={resending || (turnstileEnabled && !turnstileToken)}
            onClick={handleResendVerification}
          >
            {resending
              ? t("Sending...")
              : t("Resend verification email")}
          </Button>
        )}
      </form>

      {!adminOnly && (
        <>
          <div className="flex items-center gap-4 my-6">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">{t("or continue with")}</span>
            <Separator className="flex-1" />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" onClick={() => handleSSO("google")}>
              <Chrome size={16} />
            </Button>

            <Button variant="outline" onClick={() => handleSSO("atlassian")}>
              <Image src="/svgs/atlassian.svg" alt={t("Atlassian")} width={16} height={16} />
            </Button>

            <Button variant="outline" onClick={() => handleSSO("github")}>
              <Github size={16} />
            </Button>

            <Button variant="outline" onClick={() => handleSSO("apple")}>
              <Apple size={16} />
            </Button>
          </div>
        </>
      )}

      {!adminOnly && (
        <div className="text-center mt-6 text-sm text-muted-foreground">
          {t("Don't have an account?")}{" "}
          <button
            onClick={onSwitch}
            className="text-primary hover:underline"
          >
            {t("Sign Up")}
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
