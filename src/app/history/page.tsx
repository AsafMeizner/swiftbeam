"use client";

import React, { useState, useEffect } from "react";
import { FileTransfer } from "@/entities/FileTransfer";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  File,
  Image as ImageIcon,
  Video,
  FileText,
  Archive,
  Music,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatFileSize } from "@/utils/format";

const getFileIcon = (fileType: string) => {
  if (fileType?.startsWith("image/")) return ImageIcon;
  if (fileType?.startsWith("video/")) return Video;
  if (fileType?.startsWith("audio/")) return Music;
  if (fileType?.includes("pdf") || fileType?.includes("document")) return FileText;
  if (fileType?.includes("zip") || fileType?.includes("rar")) return Archive;
  return File;
};

const statusIcons: Record<string, any> = {
  completed: CheckCircle2,
  failed: XCircle,
  pending: Clock,
  transferring: Clock
};

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  transferring: "bg-blue-100 text-blue-800 border-blue-200"
};

export default function HistoryPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "sent" | "received">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "largest" | "smallest">("newest");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransfers();
  }, []);

  useEffect(() => {
    filterAndSortTransfers();
  }, [transfers, activeTab, sortBy]);

  const loadTransfers = async () => {
    setIsLoading(true);
    const transferList = await FileTransfer.list("-created_date");
    setTransfers(transferList);
    setIsLoading(false);
  };

  const filterAndSortTransfers = () => {
    let filtered = [...transfers];

    if (activeTab === "sent") {
      filtered = filtered.filter(t => t.sender_device === "My Device");
    } else if (activeTab === "received") {
      filtered = filtered.filter(t => t.recipient_device === "My Device");
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        case "oldest":
          return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
        case "largest":
          return (b.file_size ?? 0) - (a.file_size ?? 0);
        case "smallest":
          return (a.file_size ?? 0) - (b.file_size ?? 0);
        default:
          return 0;
      }
    });

    setFilteredTransfers(filtered);
  };

  const getTransferStats = () => {
    const sent = transfers.filter(t => t.sender_device === "My Device");
    const received = transfers.filter(t => t.recipient_device === "My Device");
    const totalSize = transfers.reduce((sum, t) => sum + (t.file_size || 0), 0);

    return {
      total: transfers.length,
      sent: sent.length,
      received: received.length,
      totalSize
    };
  };

  const stats = getTransferStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Transfer History</h1>
          <p className="text-gray-600 text-lg">Track all your file sharing activity</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="border-0 shadow-md bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <File className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total Transfers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                  <p className="text-sm text-gray-600">Files Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.received}</p>
                  <p className="text-sm text-gray-600">Files Received</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Archive className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats.totalSize)}</p>
                  <p className="text-sm text-gray-600">Data Transferred</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="bg-gray-100">
                    <TabsTrigger value="all">All Transfers</TabsTrigger>
                    <TabsTrigger value="sent">Sent</TabsTrigger>
                    <TabsTrigger value="received">Received</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="largest">Largest Files</SelectItem>
                      <SelectItem value="smallest">Smallest Files</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading transfers...</p>
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No transfers found</h3>
                    <p className="text-gray-600">Start sharing files to see your transfer history here.</p>
                  </div>
                ) : (
                  filteredTransfers.map((transfer) => {
                    const FileIcon = getFileIcon(transfer.file_type);
                    const StatusIcon = statusIcons[transfer.transfer_status];
                    const isSent = transfer.sender_device === "My Device";

                    return (
                      <motion.div
                        key={transfer.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <FileIcon className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 truncate">{transfer.filename}</p>
                            {isSent ? (
                              <ArrowUpRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{formatFileSize(transfer.file_size)}</span>
                            <span>
                              {isSent ? `→ ${transfer.recipient_device}` : `← ${transfer.sender_device}`}
                            </span>
                            <span>{format(new Date(transfer.created_date), "MMM d, h:mm a")}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`${statusColors[transfer.transfer_status]} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {transfer.transfer_status}
                          </Badge>

                          {transfer.file_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="hover:bg-blue-100 hover:text-blue-600"
                            >
                              <a href={transfer.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
