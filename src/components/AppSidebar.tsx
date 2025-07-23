"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  Zap,
  Monitor,
  Users,
  Smartphone,
  Settings,
  History,
  Share,
} from "lucide-react";
import { createPageUrl } from "@/utils/createPageUrl";

const navigationItems = [
  { title: "Discovery", url: createPageUrl("Discovery"), icon: Wifi, description: "Find nearby devices" },
  { title: "Share Files", url: createPageUrl("Share"), icon: Share, description: "Send files instantly" },
  { title: "History", url: createPageUrl("History"), icon: History, description: "Transfer records" },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings, description: "App preferences" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [onlineDevicesCount, setOnlineDevicesCount] = useState(0);

  // Simulate device count for now - in real app this would come from context or props
  useEffect(() => {
    // This would be replaced with actual device discovery logic
    const simulateDeviceCount = () => {
      setOnlineDevicesCount(Math.floor(Math.random() * 5) + 1);
    };
    
    simulateDeviceCount();
    const interval = setInterval(simulateDeviceCount, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar className="border-r-0 shadow-sm glass-effect hidden md:flex">
      <SidebarHeader className="border-b border-gray-100 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-gradient">SwiftBeam</h2>
            <p className="text-xs" style={{ color: "var(--swift-gray-400)" }}>
              Fast, private sharing
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3">
        {/* Status Card */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 border border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">Device Online</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Users className="w-3 h-3" />
            <span>{onlineDevicesCount} devices nearby</span>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--swift-gray-400)" }}
          >
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`hover-lift rounded-xl mb-1 transition-all duration-200 ${
                      pathname === item.url
                        ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm"
                        : "hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-4 py-3">
                      <item.icon
                        className={`w-4 h-4 ${
                          pathname === item.url ? "text-blue-600" : "text-gray-500"
                        }`}
                      />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{item.title}</span>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: "var(--swift-gray-900)" }}>
              My Device
            </p>
            <p className="text-xs truncate" style={{ color: "var(--swift-gray-400)" }}>
              Ready to share
            </p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Online
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
