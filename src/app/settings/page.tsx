"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  Smartphone,
  Shield,
  Bell,
  Save,
  RefreshCw,
  Check,
  Radio,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input"; // reuse Label from input file
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { UserData } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useBroadcastSettings, useBroadcastStatus } from "@/contexts/WiFiAwareContext";

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const { theme, setTheme } = useTheme();
  const { settings: wifiSettings, updateSettings: updateWifiSettings } = useBroadcastSettings();
  const { isBroadcasting, startBroadcasting, stopBroadcasting } = useBroadcastStatus();
  const [settings, setSettings] = useState({
    deviceName: "My Device",
    autoDiscovery: true,
    notifications: true,
    encryptionEnabled: true,
    maxFileSize: "100",
    networkInterface: "wifi"
  });
  const [userInfo, setUserInfo] = useState({
    fullName: "Swift User",
    email: "",
    phoneNumber: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      if (userData.settings) {
        setSettings(prev => ({ ...prev, ...userData.settings }));
      }
      // Load user info from userData or localStorage
      const savedUserInfo = localStorage.getItem('userInfo');
      if (savedUserInfo) {
        setUserInfo(JSON.parse(savedUserInfo));
      } else if (userData) {
        setUserInfo({
          fullName: userData.full_name || "Swift User",
          email: userData.email || "",
          phoneNumber: "" // Will be stored separately in localStorage
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      // Load from localStorage as fallback
      const savedUserInfo = localStorage.getItem('userInfo');
      if (savedUserInfo) {
        setUserInfo(JSON.parse(savedUserInfo));
      }
    }
    setIsLoading(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await User.updateMyUserData({ settings });
      // Save user info to localStorage
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000); // Show "Saved!" for 2 seconds
    } catch (error) {
      console.error("Error saving settings:", error);
    }
    setIsSaving(false);
  };

  const updateSetting = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateUserInfo = (key: string, value: string) => {
    setUserInfo(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Customize your SwiftBeam experience</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1">
            <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-xl">{userInfo.fullName}</CardTitle>
                <p className="text-gray-600 dark:text-gray-400">{userInfo.email || "No email set"}</p>
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/30 mx-auto">
                  Online
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Account Type</span>
                    <Badge variant="secondary">{user?.role || "User"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Member Since</span>
                    <span className="font-medium">
                      {user?.created_date ? new Date(user.created_date).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Panels */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Info */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-gray-700 dark:text-gray-300">Full Name</Label>
                    <Input
                      id="fullName"
                      value={userInfo.fullName}
                      onChange={(e) => updateUserInfo("fullName", e.target.value)}
                      placeholder="Enter your full name"
                      className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This name will be displayed in your profile and shared with contacts
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userInfo.email}
                      onChange={(e) => updateUserInfo("email", e.target.value)}
                      placeholder="Enter your email address"
                      className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Used for contact sharing and notifications
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="text-gray-700 dark:text-gray-300">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={userInfo.phoneNumber}
                      onChange={(e) => updateUserInfo("phoneNumber", e.target.value)}
                      placeholder="Enter your phone number"
                      className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Optional - for contact sharing with nearby devices
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Device */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Device Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="deviceName" className="text-gray-700 dark:text-gray-300">Device Name</Label>
                    <Input
                      id="deviceName"
                      value={wifiSettings.deviceName}
                      onChange={(e) => updateWifiSettings({ deviceName: e.target.value })}
                      placeholder="Enter device name"
                      className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This name will be visible to other devices
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* WiFi Aware */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Sharing and Receiving Options
                    <Badge 
                      variant="outline" 
                      className="ml-2 bg-blue-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs"
                    >
                      {isBroadcasting ? "Broadcasting" : "Stopped"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Enable File Sharing</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Allow nearby devices to send you files</p>
                    </div>
                    <Switch
                      checked={wifiSettings.enabled}
                      onCheckedChange={async (checked) => {
                        await updateWifiSettings({ enabled: checked });
                        if (checked) {
                          await startBroadcasting();
                        } else {
                          await stopBroadcasting();
                        }
                      }}
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Visibility</Label>
                    <Select
                      value={wifiSettings.visibility}
                      onValueChange={(value: "everyone" | "contacts" | "off") => updateWifiSettings({ visibility: value })}
                    >
                      <SelectTrigger className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            <span>Everyone</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="contacts">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            <span>Contacts Only</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="off">
                          <div className="flex items-center gap-2">
                            <EyeOff className="w-4 h-4" />
                            <span>Hidden</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Auto-accept from trusted devices</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Automatically accept files from known contacts</p>
                    </div>
                    <Switch
                      checked={wifiSettings.autoAcceptFromTrustedDevices}
                      onCheckedChange={(checked) => updateWifiSettings({ autoAcceptFromTrustedDevices: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Allow file previews</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Show image thumbnails in transfer requests</p>
                    </div>
                    <Switch
                      checked={wifiSettings.allowPreview}
                      onCheckedChange={(checked) => updateWifiSettings({ allowPreview: checked })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxFileSize" className="text-gray-700 dark:text-gray-300">Max File Size (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      value={Math.round(wifiSettings.maxFileSize / (1024 * 1024))}
                      onChange={(e) => {
                        const mb = parseInt(e.target.value) || 100;
                        updateWifiSettings({ maxFileSize: mb * 1024 * 1024 });
                      }}
                      placeholder="100"
                      className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <Separator />

                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Radio className="w-4 h-4" />
                      <span className="font-medium">Cross-platform file sharing</span>
                    </div>
                    <ul className="text-gray-600 dark:text-gray-400 space-y-1 pl-6 text-xs">
                      <li>• Compatible with iOS, Android, Windows, macOS</li>
                      <li>• Uses WiFi Aware for direct device connection</li>
                      <li>• No internet connection required</li>
                      <li>• Encrypted and secure transfers</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Security & Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">End-to-End Encryption</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Encrypt all file transfers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.encryptionEnabled}
                        onCheckedChange={(checked) => updateSetting("encryptionEnabled", checked)}
                        disabled
                      />
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs">
                        Always On
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Your data is secure</span>
                    </div>
                    <ul className="text-gray-600 dark:text-gray-400 space-y-1 pl-6 text-xs">
                      <li>• Files are encrypted during transfer</li>
                      <li>• No data stored in the cloud</li>
                      <li>• Direct device-to-device communication</li>
                      <li>• Zero-knowledge architecture</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notifications */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    Notifications & Interface
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Push Notifications</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Get notified about transfers</p>
                    </div>
                    <Switch
                      checked={settings.notifications}
                      onCheckedChange={(checked) => updateSetting("notifications", checked)}
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Theme</Label>
                    <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'auto')}>
                      <SelectTrigger className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                        <SelectValue placeholder="Theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Save */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex justify-end">
              <Button
                onClick={saveSettings}
                disabled={isSaving}
                className={`shadow-lg hover:shadow-xl transition-all duration-200 ${
                  justSaved 
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" 
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                }`}
                size="lg"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : justSaved ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Saved!
                  </motion.div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
