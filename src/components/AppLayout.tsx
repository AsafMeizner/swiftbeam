"use client";

import React from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileHeader } from "@/components/MobileHeader";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: "var(--swift-gray-50)" }}>
      <AppSidebar />
      
      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <MobileHeader />
        
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50/30">
          {children}
        </div>
      </main>
    </div>
  );
}
