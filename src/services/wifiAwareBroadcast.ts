// src/services/wifiAwareBroadcast.ts
'use client';

import { WifiAwareCore, jsonFromB64 } from '@/lib/wifiAwareCore';
import { completeDeviceData } from '@/lib/deviceAdapters';
import type { DeviceData, FileData, FileTransferResult, NativeFileTransferProgress } from '@/types';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface IncomingFileRequest {
  id: string;
  senderDevice: DeviceData;
  files: { id: string; name: string; size: number; type: string; preview?: string }[];
  timestamp: Date;
  message?: string;
  estimatedTransferTime: number;
}

export interface BroadcastSettings {
  enabled: boolean;
  deviceName: string;
  visibility: 'everyone' | 'contacts' | 'off';
  autoAcceptFromTrustedDevices: boolean;
  allowPreview: boolean;
  maxFileSize: number;
}

export type FileRequestResponse = 'accept' | 'decline' | 'pending';

const trustedDeviceIds = new Set<string>();

export class WiFiAwareBroadcastService {
  private static instance: WiFiAwareBroadcastService;

  private broadcastingActive = false;
  private settings: BroadcastSettings = {
    enabled: false,
    deviceName: 'My Device',
    visibility: 'everyone',
    autoAcceptFromTrustedDevices: false,
    allowPreview: true,
    maxFileSize: 100 * 1024 * 1024,
  };

  private incomingRequests = new Map<string, IncomingFileRequest>();
  private activeTransfers = new Map<string, NativeFileTransferProgress>();
  private broadcastCallbacks: Array<() => void> = [];
  private requestCallbacks: Array<(r: IncomingFileRequest) => void> = [];
  private responseCallbacks: Array<(id: string, r: FileRequestResponse) => void> = [];
  private transferProgressCallbacks: Array<(p: NativeFileTransferProgress) => void> = [];
  private transferCompletedCallbacks: Array<(r: FileTransferResult) => void> = [];
  private disposers: Array<{ remove: () => Promise<void> }> = [];
  private myDeviceId = crypto.randomUUID();

  private constructor() { this.loadSettings(); }

  static getInstance() {
    if (!WiFiAwareBroadcastService.instance) {
      WiFiAwareBroadcastService.instance = new WiFiAwareBroadcastService();
    }
    return WiFiAwareBroadcastService.instance;
  }

  async startBroadcasting(): Promise<boolean> {
    if (!this.settings.enabled) return false;
    if (!WifiAwareCore.isNative()) return false;
    if (this.broadcastingActive) return true;

    const result = await WifiAwareCore.ensureAttached();
    if (!result.available) return false;

    // Set up all event listeners for the WiFi Aware API
    
    // Message handler for legacy file-request & xfer-offer
    this.disposers.push(
      await WifiAwareCore.on('messageReceived', async (m: any) => {
        const peerId = String(m?.peerId ?? '');
        if (!peerId || !m?.dataBase64) return;

        let msg: any;
        try { msg = jsonFromB64<any>(m.dataBase64); } catch { return; }

        if (msg?.type === 'file-request') {
          const reqId = crypto.randomUUID();
          const now = new Date();
          const sender = completeDeviceData({
            id: msg.sender?.deviceId ?? peerId,
            name: msg.sender?.name ?? 'Unknown',
            platform: msg.sender?.platform ?? 'android',
            is_online: true,
            last_seen: now.toISOString(),
          });

          const request: IncomingFileRequest = {
            id: reqId,
            senderDevice: sender,
            files: (msg.files ?? []).map((f: any) => ({
              id: String(f.id ?? crypto.randomUUID()),
              name: String(f.name ?? 'file'),
              size: Number(f.size ?? 0),
              type: String(f.type ?? 'application/octet-stream'),
            })),
            timestamp: now,
            message: msg.message,
            estimatedTransferTime: this.estimateSeconds(msg.files ?? []),
          };

          this.incomingRequests.set(reqId, request);
          this.notifyRequestCallbacks(request);

          if (this.settings.autoAcceptFromTrustedDevices && trustedDeviceIds.has(sender.id)) {
            await this.respondToRequest(reqId, 'accept');
          }
        }
      }),
    );
    
    // Native file transfer request handler
    this.disposers.push(
      await WifiAwareCore.on('fileTransferRequest', async (req) => {
        const { peerId, transferId, fileName, mimeType, fileSize } = req;
        const now = new Date();
        
        // Try to get device info for the sender
        let deviceInfo: any = null;
        try {
          deviceInfo = await WifiAwareCore.getDeviceInfo(peerId);
        } catch (error) {
          console.error('Error getting device info:', error);
        }
        
        const sender = completeDeviceData({
          id: peerId,
          name: deviceInfo?.deviceName || 'Unknown Device',
          type: deviceInfo?.deviceType?.toLowerCase() || 'unknown',
          platform: this.mapDeviceTypeToPlatform(deviceInfo?.deviceType),
          is_online: true,
          last_seen: now.toISOString(),
          modelName: deviceInfo?.modelName,
          osVersion: deviceInfo?.osVersion,
        });
        
        const fileRequest: IncomingFileRequest = {
          id: transferId,
          senderDevice: sender,
          files: [{
            id: transferId,
            name: fileName,
            size: fileSize,
            type: mimeType || 'application/octet-stream',
          }],
          timestamp: now,
          estimatedTransferTime: this.estimateSeconds([{ size: fileSize }]),
        };
        
        this.incomingRequests.set(transferId, fileRequest);
        this.notifyRequestCallbacks(fileRequest);
        
        if (this.settings.autoAcceptFromTrustedDevices && trustedDeviceIds.has(sender.id)) {
          await this.respondToRequest(transferId, 'accept');
        }
      })
    );
    
    // File transfer progress handler
    this.disposers.push(
      await WifiAwareCore.on('fileTransferProgress', (progress) => {
        this.activeTransfers.set(progress.transferId, progress);
        this.transferProgressCallbacks.forEach(cb => { 
          try { cb(progress); } catch { } 
        });
      })
    );
    
    // File transfer completion handler
    this.disposers.push(
      await WifiAwareCore.on('fileTransferCompleted', (result) => {
        this.activeTransfers.delete(result.transferId);
        this.transferCompletedCallbacks.forEach(cb => { 
          try { cb(result); } catch { } 
        });
      })
    );

    // Publish our presence with device info
    await WifiAwareCore.publish({
      deviceId: this.myDeviceId,
      name: this.settings.deviceName,
      platform: result.deviceName || 'unknown',
      visibility: this.settings.visibility,
      allowPreview: this.settings.allowPreview,
      v: 1,
      ts: Date.now(),
    });

    this.broadcastingActive = true;
    this.notifyBroadcastCallbacks();
    return true;
  }
  
  private mapDeviceTypeToPlatform(deviceType?: string): DeviceData['platform'] {
    if (!deviceType) return 'android';
    
    const type = deviceType.toLowerCase();
    if (type.includes('iphone') || type.includes('ipad') || type.includes('ipod')) return 'ios';
    if (type.includes('android')) return 'android';
    if (type.includes('windows')) return 'windows';
    if (type.includes('mac') || type.includes('osx')) return 'macos';
    if (type.includes('linux')) return 'linux';
    
    return 'android'; // Default fallback
  }

  async stopBroadcasting(): Promise<boolean> {
    if (!this.broadcastingActive) return true;
    try {
      await WifiAwareCore.stopAll();
      this.broadcastingActive = false;
      await Promise.allSettled(this.disposers.map(d => d.remove()));
      this.disposers = [];
      this.activeTransfers.clear();
      this.notifyBroadcastCallbacks();
      return true;
    } catch { return false; }
  }

  isBroadcasting() { return this.broadcastingActive; }

  async updateSettings(newSettings: Partial<BroadcastSettings>) {
    const wasEnabled = this.settings.enabled;
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      localStorage.setItem('wifiAwareBroadcastSettings', JSON.stringify(this.settings));
    }

    if (wasEnabled !== this.settings.enabled) {
      if (this.settings.enabled) await this.startBroadcasting();
      else await this.stopBroadcasting();
    } else if (this.broadcastingActive && this.settings.enabled) {
      await this.stopBroadcasting();
      await this.startBroadcasting();
    }
  }

  getSettings(): BroadcastSettings { return { ...this.settings }; }

  async sendFileRequest(toPeerId: string, files: FileData[], sender: DeviceData, message?: string) {
    // If we have the new file transfer API, use it for each file
    if (WifiAwareCore.isNative()) {
      for (const file of files) {
        if (file.file) {
          try {
            // Convert the file to a base64 string
            const fileBase64 = await this.fileToBase64(file.file);
            // Send the file using the new sendFileTransfer API
            await WifiAwareCore.sendFileTransfer({
              peerId: toPeerId,
              fileBase64,
              fileName: file.name,
              mimeType: file.type
            });
          } catch (error) {
            console.error(`Error sending file ${file.name}:`, error);
          }
        }
      }
      return;
    }
    
    // Fallback to legacy message-based request
    const payload = {
      type: 'file-request',
      sender: { deviceId: sender.id, name: sender.name, platform: sender.platform },
      files: files.map(f => ({ id: f.id, name: f.name, size: f.size, type: f.type })),
      message,
      v: 1,
      ts: Date.now(),
    };
    await WifiAwareCore.sendMessage(toPeerId, payload);
  }

  async respondToRequest(requestId: string, response: FileRequestResponse) {
    const req = this.incomingRequests.get(requestId);
    if (!req) return false;
    
    this.notifyResponseCallbacks(requestId, response);
    
    // If using native API, we need to handle file transfer responses
    if (response === 'accept') {
      try {
        // No need to handle save path here as the WifiAwareCore will handle it automatically
        // We're just accepting the transfer by sending a confirmation message
        await WifiAwareCore.sendMessage(req.senderDevice.id, {
          type: 'file-accept',
          requestId,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error accepting file transfer:', error);
      }
      } else if (response === 'decline') {
      try {
        await WifiAwareCore.cancelFileTransfer(requestId);
      } catch (error) {
        console.error('Error declining file transfer:', error);
      }
    }    if (response !== 'pending') this.incomingRequests.delete(requestId);
    return true;
  }

  async cancelFileTransfer(transferId: string) {
    try {
      await WifiAwareCore.cancelFileTransfer(transferId);
      return true;
    } catch (error) {
      console.error('Error cancelling file transfer:', error);
      return false;
    }
  }

  getPendingRequests() { return Array.from(this.incomingRequests.values()); }
  getRequest(id: string) { return this.incomingRequests.get(id); }
  getTransferProgress(transferId: string) { return this.activeTransfers.get(transferId); }
  getAllTransfers() { return Array.from(this.activeTransfers.values()); }
  clearPendingRequests() { this.incomingRequests.clear(); }

  onBroadcastStatusChange(cb: () => void) { this.broadcastCallbacks.push(cb); }
  onIncomingRequest(cb: (r: IncomingFileRequest) => void) { this.requestCallbacks.push(cb); }
  onRequestResponse(cb: (id: string, r: FileRequestResponse) => void) { this.responseCallbacks.push(cb); }
  onTransferProgress(cb: (p: NativeFileTransferProgress) => void) { this.transferProgressCallbacks.push(cb); }
  onTransferCompleted(cb: (r: FileTransferResult) => void) { this.transferCompletedCallbacks.push(cb); }
  
  removeCallback(cb: () => void) { this.broadcastCallbacks = this.broadcastCallbacks.filter(f => f !== cb); }
  removeIncomingRequestCallback(cb: (r: IncomingFileRequest) => void) { 
    this.requestCallbacks = this.requestCallbacks.filter(f => f !== cb); 
  }
  removeRequestResponseCallback(cb: (id: string, r: FileRequestResponse) => void) {
    this.responseCallbacks = this.responseCallbacks.filter(f => f !== cb);
  }
  removeTransferProgressCallback(cb: (p: NativeFileTransferProgress) => void) {
    this.transferProgressCallbacks = this.transferProgressCallbacks.filter(f => f !== cb);
  }
  removeTransferCompletedCallback(cb: (r: FileTransferResult) => void) {
    this.transferCompletedCallbacks = this.transferCompletedCallbacks.filter(f => f !== cb);
  }

  canReceiveFiles() { return this.settings.enabled && this.settings.visibility !== 'off'; }

  getVisibilityStatus(): string {
    if (!this.settings.enabled) return 'Hidden';
    if (!this.broadcastingActive) return 'Available (Not Broadcasting)';
    switch (this.settings.visibility) {
      case 'everyone': return 'Visible to Everyone';
      case 'contacts': return 'Visible to Contacts Only';
      case 'off': return 'Hidden';
      default: return 'Unknown';
    }
  }
  
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  // ===== internal =====
  private loadSettings() {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('wifiAwareBroadcastSettings');
        if (saved) this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch { }
  }

  private estimateSeconds(files: { size: number }[]) {
    const total = files.reduce((s, f) => s + (f.size || 0), 0);
    const avg = 20 * 1024 * 1024; // 20 MB/s
    return Math.ceil(total / avg);
  }

  private notifyBroadcastCallbacks() { this.broadcastCallbacks.forEach(cb => { try { cb(); } catch { } }); }
  private notifyRequestCallbacks(r: IncomingFileRequest) { this.requestCallbacks.forEach(cb => { try { cb(r); } catch { } }); }
  private notifyResponseCallbacks(id: string, r: FileRequestResponse) { this.responseCallbacks.forEach(cb => { try { cb(id, r); } catch { } }); }

  private async handleTransferOffer(offer: {
    fromPeerId: string;
    files: Array<{ id: string; name: string; url: string; type: string }>;
    messageId?: string;
  }) {
    // This is for legacy support - the new API handles file saving directly
    for (const f of offer.files) {
      await this.saveHttpFile(f.url, f.name);
    }
  }

  private async saveHttpFile(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ab = await blob.arrayBuffer();
      const data = btoa(String.fromCharCode(...new Uint8Array(ab)));
      await Filesystem.writeFile({
        path: `WiFiAware/${Date.now()}-${filename}`,
        data,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch (error) {
      console.error(`Error saving file ${filename}:`, error);
    }
  }
}

export const getWiFiAwareBroadcastService = () => WiFiAwareBroadcastService.getInstance();
export const startBroadcasting = () => getWiFiAwareBroadcastService().startBroadcasting();
export const stopBroadcasting = () => getWiFiAwareBroadcastService().stopBroadcasting();
export const isBroadcasting = () => getWiFiAwareBroadcastService().isBroadcasting();

export const respondToFileRequest = (
  requestId: string,
  response: FileRequestResponse,
) => getWiFiAwareBroadcastService().respondToRequest(requestId, response);

export const cancelFileTransfer = (transferId: string) => 
  getWiFiAwareBroadcastService().cancelFileTransfer(transferId);
  
export const getTransferProgress = (transferId: string) =>
  getWiFiAwareBroadcastService().getTransferProgress(transferId);

export const getAllTransfers = () =>
  getWiFiAwareBroadcastService().getAllTransfers();
