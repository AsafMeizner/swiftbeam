import "./globals.css";
import React from "react";
import { Inter } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileHeader } from "@/components/MobileHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SwiftBeam",
  description: "Fast, private sharing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <SidebarProvider>
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
        </SidebarProvider>
      </body>
    </html>
  );
}
