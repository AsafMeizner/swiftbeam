"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  onDrop: (e: React.DragEvent) => void;
  onDrag: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dragActive: boolean;
  disabled?: boolean;
};

export default function FileDropZone({ onDrop, onDrag, onFileSelect, dragActive, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => fileInputRef.current?.click();

  return (
    <Card
      className={`border-0 shadow-lg transition-all duration-300 ${
        dragActive
          ? "shadow-2xl ring-4 ring-green-500/20 bg-gradient-to-br from-green-50 to-blue-50"
          : "bg-white/90 backdrop-blur-sm hover:shadow-xl"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <CardContent className="p-8">
        <motion.div
          animate={dragActive ? { scale: 1.02 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            dragActive ? "border-green-400 bg-green-50/50" : "border-gray-200 hover:border-gray-300"
          }`}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
        >
          <input ref={fileInputRef} type="file" multiple onChange={onFileSelect} className="hidden" disabled={disabled} />

          <motion.div className="flex flex-col items-center gap-6" animate={dragActive ? { y: -5 } : { y: 0 }}>
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                dragActive ? "bg-gradient-to-br from-green-500 to-green-600 scale-110" : "bg-gradient-to-br from-blue-500 to-blue-600"
              }`}
            >
              {dragActive ? <Zap className="w-10 h-10 text-white animate-pulse" /> : <Upload className="w-10 h-10 text-white" />}
            </div>

            <div>
              <h3
                className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
                  dragActive ? "text-green-700" : "text-gray-900"
                }`}
              >
                {dragActive ? "Drop files here!" : "Share files instantly"}
              </h3>
              <p className="text-gray-600 text-lg mb-6">
                {dragActive ? "Release to add files to your sharing queue" : "Drag & drop files here or click to browse"}
              </p>

              <Button
                onClick={handleClick}
                disabled={disabled}
                className={`transition-all duration-300 shadow-lg hover:shadow-xl ${
                  dragActive
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                }`}
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Choose Files
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded-full">Photos</span>
              <span className="px-2 py-1 bg-gray-100 rounded-full">Videos</span>
              <span className="px-2 py-1 bg-gray-100 rounded-full">Documents</span>
              <span className="px-2 py-1 bg-gray-100 rounded-full">Any file type</span>
            </div>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
