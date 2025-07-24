"use client";

import React from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/utils/format";
import { FileTransferData } from "@/types";

type Props = {
  transfers: FileTransferData[];
};

export default function TransferProgress({ transfers }: Props) {
  return (
    <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Recent Transfers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transfers.map((transfer, index) => (
            <motion.div
              key={transfer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
            >
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{transfer.filename}</p>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>{formatFileSize(transfer.file_size)}</span>
                  <span>→ {transfer.recipient_device}</span>
                </div>
              </div>

              <div className="text-right">
                <Badge className="bg-green-100 text-green-800 text-xs">Complete</Badge>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {transfer.completion_time && format(new Date(transfer.completion_time), "h:mm a")}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
