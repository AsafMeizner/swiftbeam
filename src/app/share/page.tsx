"use client";

import React, { useState, useCallback } from "react";
import { FileTransfer } from "@/entities/FileTransfer";
import { UploadFile } from "@/integrations/Core";
import { motion, AnimatePresence } from "framer-motion";
import {
  File,
  Image as ImageIcon,
  Video,
  FileText,
  Archive,
  Music,
  X,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FileDropZone from "@/components/share/FileDropZone";
import DeviceSelector from "@/components/share/DeviceSelector";
import TransferProgress from "@/components/share/TransferProgress";
import { formatFileSize } from "@/utils/format";
import { FileData, DeviceData, FileTransferData } from "@/types";

export default function SharePage() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transfers, setTransfers] = useState<FileTransferData[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const fileObjects: FileData[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      status: "ready"
    }));
    setFiles(prev => [...prev, ...fileObjects]);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith("image/")) return ImageIcon;
    if (fileType?.startsWith("video/")) return Video;
    if (fileType?.startsWith("audio/")) return Music;
    if (fileType?.includes("pdf") || fileType?.includes("document")) return FileText;
    if (fileType?.includes("zip") || fileType?.includes("rar")) return Archive;
    return File;
  };

  const startTransfer = async () => {
    if (!selectedDevice || files.length === 0) return;

    setTransferring(true);

    for (const fileObj of files) {
      try {
        // Update to transferring
        setFiles(prev => prev.map(f => (f.id === fileObj.id ? { ...f, status: "transferring" } : f)));

        // Upload file
        const { file_url } = await UploadFile({ file: fileObj.file! });

        // Create transfer record
        const transferRecord = await FileTransfer.create({
          filename: fileObj.name,
          file_size: fileObj.size,
          file_type: fileObj.type,
          file_url,
          sender_device: "My Device",
          recipient_device: selectedDevice.name,
          transfer_status: "completed",
          transfer_speed: Math.random() * 50 + 10,
          completion_time: new Date().toISOString()
        });

        // Update to completed
        setFiles(prev => prev.map(f => (f.id === fileObj.id ? { ...f, status: "completed" } : f)));

        setTransfers(prev => [transferRecord, ...prev]);

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        setFiles(prev => prev.map(f => (f.id === fileObj.id ? { ...f, status: "failed" } : f)));
        console.error("Transfer failed:", error);
      }
    }

    setTransferring(false);
    // Remove completed after delay
    setTimeout(() => {
      setFiles(prev => prev.filter(f => f.status === "failed"));
    }, 2000);
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Share Files</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Drag, drop, and share files instantly with nearby devices</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload area */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <FileDropZone
                onDrop={handleDrop}
                onDrag={handleDrag}
                onFileSelect={handleFileInput}
                dragActive={dragActive}
                disabled={transferring}
              />
            </motion.div>

            {files.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ready to Share ({files.length})</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total: {formatFileSize(totalSize)}</div>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {files.map((fileObj) => {
                          const FileIcon = getFileIcon(fileObj.type);

                          return (
                            <motion.div
                              key={fileObj.id}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                <FileIcon className="w-5 h-5 text-white" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{fileObj.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(fileObj.size)}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                {fileObj.status === "ready" && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    Ready
                                  </Badge>
                                )}
                                {fileObj.status === "transferring" && (
                                  <Badge className="bg-yellow-500 text-white animate-pulse">Sending...</Badge>
                                )}
                                {fileObj.status === "completed" && (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Sent
                                  </Badge>
                                )}
                                {fileObj.status === "failed" && (
                                  <Badge variant="destructive">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Failed
                                  </Badge>
                                )}

                                {!transferring && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFile(fileObj.id)}
                                    className="hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Device + control */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <DeviceSelector selectedDevice={selectedDevice} onDeviceSelect={setSelectedDevice} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Transfer Control</h3>

                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {files.length} file{files.length !== 1 ? "s" : ""} ready
                      {selectedDevice && (
                        <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">→ {selectedDevice.name}</div>
                      )}
                    </div>

                    <Button
                      onClick={startTransfer}
                      disabled={!selectedDevice || files.length === 0 || transferring}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-200"
                      size="lg"
                    >
                      {transferring ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Transferring...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Start Transfer
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {transfers.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <TransferProgress transfers={transfers.slice(0, 3)} />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
