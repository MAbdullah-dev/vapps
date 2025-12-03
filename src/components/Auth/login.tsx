"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import { Eye, EyeOff, Github, Apple, Chrome } from "lucide-react";

import { loginSchema, LoginInput } from "@/schemas/auth/auth.schema";
import { apiClient } from "@/lib/api-client";

type LoginProps = {
  onSwitch: () => void;
};

const Login = ({ onSwitch }: LoginProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // ✅ EMAIL + PASSWORD LOGIN
  const onSubmit = async (data: LoginInput) => {
    try {
      setLoading(true);

      await apiClient.login(data);

      toast.success("Logged in successfully");
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ SSO HANDLER
  const handleSSO = async (provider: "google" | "github" | "apple" | "atlassian") => {
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      toast.error("SSO login failed");
    }
  };

  return (
    <div className="border border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 rounded-2xl max-w-[400px] w-full mx-auto">
      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-xl mb-2">Welcome Back</h1>
        <p className="text-base text-[#4A5565]">Login to your account</p>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div className="mb-4">
          <Label htmlFor="email" className="text-sm mb-2">
            Email
          </Label>
          <Input placeholder="Email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-4">
          <Label htmlFor="password" className="text-sm mb-2">
            Password
          </Label>
          <div className="relative">
            <Input
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

        {/* Remember + Forgot */}
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-sm text-[#0A0A0A]">
            <input type="checkbox" /> Remember me
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-[#4F39F6] text-sm hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <Button
          disabled={loading}
          className="w-full text-white py-2 text-sm hover:bg-[#6db966]"
          variant="default"
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <Separator className="flex-1" />
        <span className="text-gray-500 text-sm">or continue with</span>
        <Separator className="flex-1" />
      </div>

      {/* ✅ SSO BUTTONS */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        <Button variant="outline" onClick={() => handleSSO("google")}>
          <Chrome size={16} />
        </Button>

        <Button variant="outline" onClick={() => handleSSO("atlassian")}>
          <Image
            src="/svgs/atlassian.svg"
            alt="atlassian"
            width={16}
            height={16}
          />
        </Button>

        <Button variant="outline" onClick={() => handleSSO("github")}>
          <Github size={16} />
        </Button>

        <Button variant="outline" onClick={() => handleSSO("apple")}>
          <Apple size={16} />
        </Button>
      </div>

      {/* Switch */}
      <div className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <button
          onClick={onSwitch}
          className="text-[#16A34A] text-base hover:underline"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default Login;
