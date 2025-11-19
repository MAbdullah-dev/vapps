"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Github, Apple, Chrome, Square } from "lucide-react";
import Link from "next/link";
import { Label } from "../ui/label";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="border border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 rounded-2xl max-w-[400px] w-full mx-auto">

      <div className="text-center mb-8">
        <h1 className="text-xl mb-2">Create Account</h1>
        <p className="text-base text-[#4A5565]">Start your journey with VApps</p>
      </div>

      <div className="mb-4">
        <Label htmlFor="fullName" className="text-sm mb-2">Full Name</Label>
        <Input placeholder="Full Name" />
      </div>

      <div className="mb-4">
        <Label htmlFor="email" className="text-sm mb-2">Email</Label>
        <Input placeholder="Email" type="email" />
      </div>

      <div className="mb-6 relative">
        <Label htmlFor="password" className="text-sm mb-2">Password</Label>
        <Input
          placeholder="Password"
          type={showPassword ? "text" : "password"}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <Button className="w-full text-white py-2 text-sm hover:bg-[#6db966]" variant="default">
        Create Account
      </Button>

      <div className="flex items-center gap-4 my-6">
        <Separator className="flex-1" />
        <span className="text-gray-500 text-sm">or continue with</span>
        <Separator className="flex-1" />
      </div>

      <div className="grid grid-cols-4 gap-2.5 mb-6">
        <Button variant="outline" className="flex justify-center">
          <Chrome size={16} />
        </Button>
        <Button variant="outline" className="flex justify-center">
          <Square size={16} />
        </Button>
        <Button variant="outline" className="flex justify-center">
          <Github size={16} />
        </Button>
        <Button variant="outline" className="flex justify-center">
          <Apple size={16} />
        </Button>
      </div>

      <div className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#16A34A] text-base hover:underline">
          Log In
        </Link>
      </div>
    </div>
  );
};

export default Register;
