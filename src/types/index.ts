// Common types used across the application

export interface DeviceData {
  id: string;
  name: string;
  type: "phone" | "tablet" | "laptop" | "desktop" | "unknown";
  platform: "ios" | "android" | "windows" | "macos" | "linux" | "web";
  is_online: boolean;
  last_seen: string;
  connection_status: "connected" | "connecting" | "disconnected" | "available";
  created_date: string;
  // New fields from the WiFi Aware plugin DeviceInfo
  modelName?: string;
  osVersion?: string;
  capabilities?: string[];
  distanceMm?: number;
}

export interface FileTransferData {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  file_url?: string;
  sender_device: string;
  recipient_device: string;
  transfer_status: "pending" | "transferring" | "completed" | "failed" | "cancelled";
  transfer_speed?: number;
  completion_time?: string;
  created_date: string;
}

export interface UserData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_date: string;
  settings?: UserSettings;
}

export interface UserSettings {
  deviceName?: string;
  autoDiscovery?: boolean;
  notifications?: boolean;
  encryptionEnabled?: boolean;
  theme?: string;
  maxFileSize?: string;
  networkInterface?: string;
}

export interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  file?: File;
  status: "ready" | "transferring" | "completed" | "failed";
}

export interface NativeFileTransferProgress {
  peerId: string;
  transferId: string;
  fileName: string;
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
  direction: 'incoming' | 'outgoing';
  status: 'in-progress' | 'completed' | 'failed' | 'cancelled';
}

export interface FileTransferRequest {
  peerId: string;
  transferId: string;
  fileName: string;
  mimeType?: string;
  fileSize: number;
}

export interface FileTransferResult {
  peerId: string;
  transferId: string;
  fileName: string;
  filePath?: string;
  fileBase64?: string;
}

export interface SocketInfo {
  socketId: string;
  role: 'publisher' | 'subscriber';
  localPort?: number;
  peerIpv6?: string;
  peerPort?: number;
  multicastEnabled?: boolean;
  connectedPeers?: string[];
}

export type TransferStatusType = "pending" | "transferring" | "completed" | "failed" | "cancelled";
export type SortType = "newest" | "oldest" | "largest" | "smallest";
export type TabType = "all" | "sent" | "received";
