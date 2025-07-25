"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Clock,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  FolderOpen,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFileSize, formatTimeAgo } from "@/utils/format";
import { IncomingFileRequest, FileRequestResponse } from "@/services/wifiAwareBroadcast";
import { DeviceData } from "@/types";
import { LucideIcon } from "lucide-react";

const deviceIcons: Record<string, LucideIcon> = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
  unknown: Smartphone
};

const fileIcons: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
  archive: Archive,
  default: File
};

type Props = {
  request: IncomingFileRequest | null;
  isOpen: boolean;
  onResponse: (response: FileRequestResponse, saveLocation?: string) => void;
  onClose: () => void;
};

export default function IncomingFileRequestModal({ request, isOpen, onResponse, onClose }: Props) {
  const [saveLocation, setSaveLocation] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen && request) {
      // Set default save location
      setSaveLocation("~/Downloads");
    }
  }, [isOpen, request]);

  if (!request) return null;

  const getFileIcon = (fileType: string): LucideIcon => {
    if (fileType.startsWith("image/")) return fileIcons.image;
    if (fileType.startsWith("video/")) return fileIcons.video;
    if (fileType.startsWith("audio/")) return fileIcons.audio;
    if (fileType.includes("pdf") || fileType.includes("document")) return fileIcons.document;
    if (fileType.includes("zip") || fileType.includes("rar")) return fileIcons.archive;
    return fileIcons.default;
  };

  const getTotalSize = () => {
    return request.files.reduce((sum, file) => sum + file.size, 0);
  };

  const formatTransferTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const handleResponse = async (response: FileRequestResponse) => {
    setIsResponding(true);
    try {
      await onResponse(response, response === "accept" ? saveLocation : undefined);
      if (response !== "pending") {
        onClose();
      }
    } finally {
      setIsResponding(false);
    }
  };

  const DeviceIcon = deviceIcons[request.senderDevice.type] || deviceIcons.unknown;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md mx-auto"
          >
            <Card className="border-0 shadow-2xl bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    Incoming Files
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Sender Info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <DeviceIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {request.senderDevice.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {request.senderDevice.platform} • {formatTimeAgo(request.timestamp)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {request.senderDevice.type}
                  </Badge>
                </div>

                {/* Message */}
                {request.message && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{request.message}"
                    </p>
                  </div>
                )}

                {/* Files List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Files ({request.files.length})
                    </h4>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatFileSize(getTotalSize())}
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {request.files.map((file) => {
                      const FileIcon = getFileIcon(file.type);
                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          {file.preview ? (
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                              <FileIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Transfer Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Estimated time: {formatTransferTime(request.estimatedTransferTime)}</span>
                  </div>
                </div>

                {/* Save Location */}
                <div className="space-y-2">
                  <Label htmlFor="saveLocation" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Save to:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="saveLocation"
                      value={saveLocation}
                      onChange={(e) => setSaveLocation(e.target.value)}
                      placeholder="Choose save location..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Advanced Options */}
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Advanced Options</h5>
                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                      <p>• Files will be scanned for malware</p>
                      <p>• Transfer will use encrypted connection</p>
                      <p>• Sender will be notified of your response</p>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleResponse("decline")}
                    disabled={isResponding}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                  <Button
                    onClick={() => handleResponse("accept")}
                    disabled={isResponding || !saveLocation.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isResponding ? "Accepting..." : "Accept"}
                  </Button>
                </div>

                {/* Warning for large files */}
                {getTotalSize() > 100 * 1024 * 1024 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Large file transfer may take significant time and data usage
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
