"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import { Eye, EyeOff, Github, Apple, Chrome } from "lucide-react";
import Image from "next/image";

import { Turnstile } from "@marsidev/react-turnstile";

import { registerSchema, RegisterInput } from "@/schemas/auth/auth.schema";
import { apiClient } from "@/lib/api-client";
import { useTranslate } from "@/components/providers/translation-provider";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type RegisterProps = {
  onSwitch: () => void;
};

const Register = ({ onSwitch }: RegisterProps) => {
  const { t } = useTranslate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const turnstileEnabled = Boolean(TURNSTILE_SITE_KEY);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  // ✅ REGISTER HANDLER
  const onSubmit = async (data: RegisterInput) => {
    try {
      if (turnstileEnabled && !turnstileToken) {
        toast.error(t("Please complete the security check"));
        return;
      }

      setLoading(true);

      const result = await apiClient.register({
        ...data,
        ...(turnstileEnabled && turnstileToken
          ? { turnstileToken }
          : {}),
      });

      toast.success(
        t(
          result.message ||
            "Check your email for next steps. If you already have an account, sign in instead."
        )
      );

      reset();
      if (turnstileEnabled) {
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      }
      onSwitch(); // switch to login
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("Registration failed");
      toast.error(message);
      if (turnstileEnabled) {
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border bg-card text-card-foreground shadow-lg p-8 rounded-2xl max-w-[400px] w-full mx-auto">
      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-xl mb-2">{t("Create Account")}</h1>
        <p className="text-base text-muted-foreground">
          {t("Start your journey with Vie")}
        </p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div className="mb-4">
          <Label htmlFor="email" className="text-sm mb-2">
            {t("Email")}
          </Label>
          <Input placeholder={t("Email")} type="email" {...register("email")} />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-4">
          <Label htmlFor="password" className="text-sm mb-2">
            {t("Password")}
          </Label>
          <div className="relative">
            <Input
              placeholder={t("Password")}
              type={showPassword ? "text" : "password"}
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <Label htmlFor="confirmPassword" className="text-sm mb-2">
            {t("Confirm Password")}
          </Label>
          <div className="relative">
            <Input
              placeholder={t("Confirm Password")}
              type={showPassword ? "text" : "password"}
              className="pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
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
          disabled={loading || (turnstileEnabled && !turnstileToken)}
          className="w-full py-2 text-sm"
          variant="default"
        >
          {loading ? t("Creating Account...") : t("Create Account")}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-sm">{t("or continue with")}</span>
        <Separator className="flex-1" />
      </div>

      {/* SOCIAL LOGIN */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        <Button
          type="button"
          variant="outline"
          className="flex justify-center"
          onClick={() => signIn("google")}
        >
          <Chrome size={16} />
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex justify-center"
          onClick={() => signIn("atlassian")}
        >
          <Image
            src="/svgs/atlassian.svg"
            alt={t("atlassian")}
            width={16}
            height={16}
          />
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex justify-center"
          onClick={() => signIn("github")}
        >
          <Github size={16} />
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex justify-center"
          onClick={() => signIn("apple")}
        >
          <Apple size={16} />
        </Button>
      </div>

      {/* Switch */}
      <div className="text-center text-sm text-muted-foreground">
        {t("Already have an account?")}{" "}
        <button
          onClick={onSwitch}
          className="text-primary text-base hover:underline"
        >
          {t("Log In")}
        </button>
      </div>
    </div>
  );
};

export default Register;
