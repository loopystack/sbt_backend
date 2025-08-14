import React from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";

export default function AppShell() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        {/* Left Sidebar */}
        <LeftSidebar />
        
        {/* Main Content */}
        <main className="flex-1 px-6 py-6 max-w-none">
          <Outlet />
        </main>
        
        {/* Right Sidebar */}
        <RightSidebar />
      </div>
    </div>
  );
}
