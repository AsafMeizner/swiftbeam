"use client";

import React, { useState, useEffect } from "react";
import { Device } from "@/entities/Device";
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

const deviceIcons: Record<string, any> = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  unknown: Smartphone
};

type Props = {
  selectedDevice: any;
  onDeviceSelect: (device: any) => void;
};

export default function DeviceSelector({ selectedDevice, onDeviceSelect }: Props) {
  const [devices, setDevices] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    const list = await Device.list("-last_seen");
    setDevices(list);
  };

  const scanForDevices = async () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      loadDevices();
    }, 1500);
  };

  const onlineDevices = devices.filter(d => d.is_online);

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-green-600" />
            Select Device
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={scanForDevices}
            disabled={isScanning}
            className="hover:bg-gray-100"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {onlineDevices.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <WifiOff className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm">No devices available</p>
            <Button variant="outline" size="sm" onClick={scanForDevices} className="mt-2">
              Scan Again
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {onlineDevices.map((device) => {
              const DeviceIcon = deviceIcons[device.type];
              const isSelected = selectedDevice?.id === device.id;

              return (
                <motion.div
                  key={device.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected ? "ring-2 ring-green-500 ring-offset-2" : ""
                  }`}
                  onClick={() => onDeviceSelect(device)}
                >
                  <div
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isSelected ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
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
                        <p className="font-medium text-gray-900 truncate">{device.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {device.platform?.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
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
