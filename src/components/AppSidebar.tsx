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
  Users,
  Smartphone,
  Settings,
  History,
  Share,
  Download
} from "lucide-react";
import { createPageUrl } from "@/utils/createPageUrl";
import { useIncomingRequests, useBroadcastSettings, useBroadcastStatus } from "@/contexts/WiFiAwareContext";
import { getDeviceDiscoveryService } from "@/services/deviceDiscovery";
import { DeviceData } from "@/types";

const navigationItems = [
  { title: "Discovery", url: createPageUrl("Discovery"), icon: Wifi, description: "Find nearby devices" },
  { title: "Share Files", url: createPageUrl("Share"), icon: Share, description: "Send files instantly" },
  { title: "History", url: createPageUrl("History"), icon: History, description: "Transfer records" },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings, description: "App preferences" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [onlineDevicesCount, setOnlineDevicesCount] = useState(0);
  const { pendingRequests, showRequest } = useIncomingRequests();
  const { isBroadcasting } = useBroadcastStatus();
  const { settings } = useBroadcastSettings();

  // Get actual device count from device discovery service
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const deviceDiscovery = getDeviceDiscoveryService();
        const activeDevices = await deviceDiscovery.getActiveDevices();
        setOnlineDevicesCount(activeDevices.length);
      } catch (error) {
        console.error("Failed to load devices:", error);
        setOnlineDevicesCount(0);
      }
    };

    loadDevices();
    const interval = setInterval(loadDevices, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar className="border-r-0 shadow-sm glass-effect hidden md:flex">
      <SidebarHeader className="border-b border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-gradient">SwiftBeam</h2>
            <p className="text-xs text-muted-foreground">
              Fast, private sharing
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3">
        {/* Status Card */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border border-green-100 dark:border-green-800/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Device Online</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Users className="w-3 h-3" />
            <span>{onlineDevicesCount} devices nearby</span>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel
            className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted-foreground"
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
                        ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30 shadow-sm"
                        : "hover:bg-white dark:hover:bg-gray-800/50 hover:shadow-sm"
                    }`}
                  >
                    <Link href={item.url} className="flex items-center gap-3 px-4 py-3">
                      <item.icon
                        className={`w-4 h-4 ${
                          pathname === item.url ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{item.title}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-3">
        {/* Device Status */}
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
            </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-foreground">
              {settings.deviceName}
            </p>
            <p className="text-xs truncate text-muted-foreground">
              {!settings.enabled 
                ? "Sharing disabled"
                : settings.visibility === "off" 
                  ? "Hidden"
                  : settings.visibility === "contacts"
                    ? "Contacts only"
                    : isBroadcasting 
                      ? "Broadcasting" 
                      : "Ready to share"
              }
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${
              settings.enabled && settings.visibility !== "off" && isBroadcasting
                ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/30"
                : "bg-gray-50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800/30"
            }`}
          >
            {settings.enabled && settings.visibility !== "off" && isBroadcasting ? "Online" : "Offline"}
          </Badge>
        </div>

        {/* Pending Requests Indicator */}
        {pendingRequests.length > 0 && (
          <button
            onClick={() => {
              if (pendingRequests.length > 0) {
                showRequest(pendingRequests[0]);
              }
            }}
            className="w-full flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div className="flex-1 text-left">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                {pendingRequests.length} file request{pendingRequests.length !== 1 ? 's' : ''} waiting
              </p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs">
              {pendingRequests.length}
            </Badge>
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
