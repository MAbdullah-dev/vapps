"use client";

import React, { useState } from "react";
import Login from "@/components/Auth/login";
import Register from "@/components/Auth/Register";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

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