"use client";

import React, { useState, useEffect } from "react";
import Login from "@/components/Auth/Login";
import Register from "@/components/Auth/Register";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "true") {
      toast.success("Email verified successfully!");
    }
  }, [searchParams]);

  return (
    <div>
      {isLogin ? (
        <Login onSwitch={() => setIsLogin(false)} />
      ) : (
        <Register onSwitch={() => setIsLogin(true)} />
      )}
    </div>
  );
};

export default AuthPage;