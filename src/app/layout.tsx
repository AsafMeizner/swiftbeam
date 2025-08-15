import "./globals.css";
import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WiFiAwareProvider } from "@/contexts/WiFiAwareContext";
// import DevToolsLoader from "@/components/DevToolsLoader";


export const metadata = {
  title: "SwiftBeam",
  description: "Fast, private sharing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <WiFiAwareProvider>
            <SidebarProvider>
              <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                
                {/* Main content */}
                <main className="flex-1 flex flex-col">
                  <MobileHeader />
                  
                  <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
                    {children}
                  </div>
                </main>
              </div>
            </SidebarProvider>
            
            {/* Load dev tools in development */}
            {/* <DevToolsLoader /> */}
          </WiFiAwareProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
