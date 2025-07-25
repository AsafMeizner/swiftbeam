"use client";

import React, { useState, useEffect } from "react";
import { getDeviceDiscoveryService } from "@/services/deviceDiscovery";
import { motion } from "framer-motion";
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceData } from "@/types";
import { LucideIcon } from "lucide-react";

const deviceIcons: Record<string, LucideIcon> = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  unknown: Smartphone
};

type Props = {
  selectedDevices: DeviceData[];
  onDeviceSelect: (devices: DeviceData[]) => void;
};

export default function DeviceSelector({ selectedDevices, onDeviceSelect }: Props) {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const deviceDiscovery = getDeviceDiscoveryService();

  useEffect(() => {
    loadDevices();
    
    // Set up scan status callback
    const handleScanStatusChange = () => {
      setIsScanning(deviceDiscovery.isCurrentlyScanning());
    };
    
    deviceDiscovery.onScanStatusChange(handleScanStatusChange);
    
    return () => {
      deviceDiscovery.removeScanStatusCallback(handleScanStatusChange);
    };
  }, [deviceDiscovery]);

  const loadDevices = async () => {
    const list = await deviceDiscovery.getAllDevices("-last_seen");
    setDevices(list);
  };

  const scanForDevices = async () => {
    await deviceDiscovery.startScan(1500);
    await loadDevices();
  };

  const toggleDeviceSelection = (device: DeviceData) => {
    const isSelected = selectedDevices.some(d => d.id === device.id);
    if (isSelected) {
      // Remove device from selection
      onDeviceSelect(selectedDevices.filter(d => d.id !== device.id));
    } else {
      // Add device to selection
      onDeviceSelect([...selectedDevices, device]);
    }
  };

  const onlineDevices = devices.filter(d => d.is_online);

  return (
    <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
            Select Devices ({selectedDevices.length})
          </CardTitle>
          <div className="flex gap-2">
            {onlineDevices.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedDevices.length === onlineDevices.length) {
                    onDeviceSelect([]);
                  } else {
                    onDeviceSelect(onlineDevices);
                  }
                }}
                className="text-xs"
              >
                {selectedDevices.length === onlineDevices.length ? "Clear" : "Select All"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={scanForDevices}
              disabled={isScanning}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {onlineDevices.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <WifiOff className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">No devices available</p>
            <Button variant="outline" size="sm" onClick={scanForDevices} className="mt-2">
              Scan Again
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {onlineDevices.map((device) => {
              const DeviceIcon = deviceIcons[device.type];
              const isSelected = selectedDevices.some(d => d.id === device.id);

              return (
                <motion.div
                  key={device.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected ? "ring-2 ring-green-500 ring-offset-2" : ""
                  }`}
                  onClick={() => toggleDeviceSelection(device)}
                >
                  <div
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-600" 
                        : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? "bg-gradient-to-br from-green-500 to-green-600"
                            : "bg-gradient-to-br from-blue-500 to-blue-600"
                        }`}
                      >
                        <DeviceIcon className="w-5 h-5 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{device.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600">
                            {device.platform?.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                            <div className="w-1.5 h-1.5 bg-green-400 dark:bg-green-500 rounded-full animate-pulse"></div>
                            <span>Online</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
