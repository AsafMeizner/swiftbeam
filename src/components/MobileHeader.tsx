"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Zap } from "lucide-react";

export function MobileHeader() {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 md:hidden">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors duration-200" />
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h1 className="text-lg font-bold text-gradient">SwiftBeam</h1>
        </div>
      </div>
    </header>
  );
}
