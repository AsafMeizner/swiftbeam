"use client";

import React, { useState, useEffect } from "react";
import { Device } from "@/entities/Device";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  Search,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeviceData } from "@/types";
import { LucideIcon } from "lucide-react";

const deviceIcons: Record<string, LucideIcon> = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  unknown: Smartphone
};

const platformColors: Record<string, string> = {
  ios: "bg-gray-900 text-white",
  android: "bg-green-600 text-white",
  windows: "bg-blue-600 text-white",
  macos: "bg-gray-800 text-white",
  linux: "bg-orange-600 text-white",
  web: "bg-purple-600 text-white"
};

export default function DiscoveryPage() {
  // Page state
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDevices();
    const interval = setInterval(() => {
      if (!isScanning) {
        simulateDeviceUpdate();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isScanning]);

  const loadDevices = async () => {
    const deviceList = await Device.list("-last_seen");
    setDevices(deviceList);
  };

  const simulateDeviceUpdate = () => {
    setDevices(prev =>
      prev.map(device => ({
        ...device,
        is_online: Math.random() > 0.3,
        last_seen: new Date().toISOString(),
      }))
    );
  };

  const startScan = async () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      loadDevices();
    }, 2000);
  };

  const toggleDeviceSelection = (deviceId: string) => {
    const newSelection = new Set(selectedDevices);
    if (newSelection.has(deviceId)) newSelection.delete(deviceId);
    else newSelection.add(deviceId);
    setSelectedDevices(newSelection);
  };

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineDevices = filteredDevices.filter(d => d.is_online);
  const offlineDevices = filteredDevices.filter(d => !d.is_online);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Device Discovery</h1>
              <p className="text-gray-600 text-lg">Find and connect to nearby devices instantly</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {onlineDevices.length} devices online
                </span>
              </div>

              <Button
                onClick={startScan}
                disabled={isScanning}
                className="bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-6"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? "animate-spin" : ""}`} />
                {isScanning ? "Scanning..." : "Refresh"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search devices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <Button
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50"
                  onClick={() => {
                    if (selectedDevices.size > 0) {
                      setSelectedDevices(new Set());
                    }
                  }}
                >
                  {selectedDevices.size > 0 ? `Clear Selection (${selectedDevices.size})` : "Select All"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Online Devices */}
        {onlineDevices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <h2 className="text-xl font-semibold text-gray-900">
                Available Now ({onlineDevices.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {onlineDevices.map((device) => {
                  const DeviceIcon = deviceIcons[device.type] || deviceIcons.unknown;
                  const isSelected = selectedDevices.has(device.id);

                  return (
                    <motion.div
                      key={device.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.02 }}
                      className={`relative cursor-pointer transition-all duration-200 ${
                        isSelected ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => toggleDeviceSelection(device.id)}
                    >
                      <Card className="border-0 shadow-md hover:shadow-lg bg-white/90 backdrop-blur-sm overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <DeviceIcon className="w-6 h-6 text-white" />
                              </div>
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 truncate">{device.name}</h3>
                                <Badge
                                  className={`text-xs px-2 py-1 ${
                                    platformColors[device.platform] || "bg-gray-600 text-white"
                                  }`}
                                >
                                  {device.platform}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Wifi className="w-3 h-3" />
                                <span>Active now</span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle className="w-5 h-5 text-blue-600" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Offline Devices */}
        {offlineDevices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <h2 className="text-xl font-semibold text-gray-900">
                Recently Seen ({offlineDevices.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offlineDevices.map((device) => {
                const DeviceIcon = deviceIcons[device.type] || deviceIcons.unknown;

                return (
                  <Card key={device.id} className="border-0 shadow-md bg-white/60 backdrop-blur-sm opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center">
                            <DeviceIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-300 rounded-full border-2 border-white"></div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-700 truncate">{device.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {device.platform}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <WifiOff className="w-3 h-3" />
                            <span>Last seen: {new Date(device.last_seen).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {filteredDevices.length === 0 && !isScanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No devices found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Make sure nearby devices are running SwiftBeam and connected to the same network.
            </p>
            <Button onClick={startScan} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Scan for Devices
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
