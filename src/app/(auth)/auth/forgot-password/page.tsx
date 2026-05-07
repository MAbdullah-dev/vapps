"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/schemas/auth/auth.schema";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          typeof json.error === "object"
            ? "Please check the email field"
            : json.error || "Request failed"
        );
        return;
      }
      toast.success(json.message || "Check your email");
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border bg-card text-card-foreground shadow-lg p-8 rounded-2xl max-w-[400px] w-full mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-xl mb-2">Forgot password</h1>
        <p className="text-base text-muted-foreground">
          {sent
            ? "If we found an account, we sent a reset link to that address."
            : "Enter your email and we will send you a link to reset your password."}
        </p>
      </div>

      {!sent && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-6">
            <Label className="text-sm mb-2">Email</Label>
            <Input
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>
          <Button className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <div className="text-center mt-6 text-sm text-muted-foreground">
        <Link href="/auth" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
