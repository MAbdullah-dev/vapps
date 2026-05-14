"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/schemas/auth/auth.schema";
import { useTranslate } from "@/components/providers/translation-provider";

function ResetPasswordForm() {
  const { t } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : t("Could not reset password");
        toast.error(msg);
        return;
      }
      toast.success(json.message || t("Password updated"));
      router.push("/auth");
      router.refresh();
    } catch {
      toast.error(t("Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="border border-border bg-card text-card-foreground shadow-lg p-8 rounded-2xl max-w-[400px] w-full mx-auto text-center">
        <h1 className="text-xl mb-2">{t("Invalid link")}</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {t(
            "This reset link is missing a token. Open the link from your email or request a new reset."
          )}
        </p>
        <Link href="/auth/forgot-password" className="text-primary hover:underline text-sm">
          {t("Request a new link")}
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card text-card-foreground shadow-lg p-8 rounded-2xl max-w-[400px] w-full mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-xl mb-2">{t("Set a new password")}</h1>
        <p className="text-base text-muted-foreground">
          {t("Choose a new password for your account.")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("token")} />

        <div className="mb-4">
          <Label className="text-sm mb-2">{t("New password")}</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              className="pr-10"
              autoComplete="new-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showPassword ? t("Hide password") : t("Show password")}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="mb-6">
          <Label className="text-sm mb-2">{t("Confirm password")}</Label>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              className="pr-10"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showConfirm ? t("Hide password") : t("Show password")}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button className="w-full" disabled={loading}>
          {loading ? t("Saving…") : t("Update password")}
        </Button>
      </form>

      <div className="text-center mt-6 text-sm text-muted-foreground">
        <Link href="/auth" className="text-primary hover:underline">
          {t("Back to sign in")}
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslate();
  return (
    <Suspense
      fallback={
        <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
          {t("Loading…")}
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
