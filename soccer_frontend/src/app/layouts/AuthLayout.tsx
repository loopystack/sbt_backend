import React from "react";
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Outlet />
    </div>
  );
}
