'use client';

import { Capacitor } from '@capacitor/core';
import { WifiAwareCore, jsonFromB64 } from '@/lib/wifiAwareCore';
import { getWiFiAwareBroadcastService } from '@/services/wifiAwareBroadcast';
import { FileTransfer } from '@/entities/FileTransfer';
import type { DeviceData, FileData, FileTransferData } from '@/types';

export type TransferStatus = 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';
export interface TransferProgress {
  fileId: string; fileName: string; status: TransferStatus; progress: number;
  speed?: number; estimatedTimeRemaining?: number; error?: string;
}
export interface TransferResult { success: boolean; transfers: FileTransferData[]; errors: string[]; }

// Keep a mapping discovered during serviceFound
const peerIdByDeviceId = new Map<string, string>();
const deviceInfoByPeerId = new Map<string, any>();

WifiAwareCore.on('serviceFound', (ev: any) => {
  try {
    if (ev?.serviceInfoBase64) {
      const info = jsonFromB64<any>(ev.serviceInfoBase64);
      if (ev?.peerId && info?.deviceId) {
        peerIdByDeviceId.set(info.deviceId, String(ev.peerId));
      }
      
      // Store device info if available
      if (ev.deviceInfo && ev.peerId) {
        deviceInfoByPeerId.set(ev.peerId, ev.deviceInfo);
      }
    }
  } catch (error) {
    console.error('Error processing serviceFound event:', error);
  }
});

WifiAwareCore.on('messageReceived', (m: any) => {
  try {
    const payload = jsonFromB64<any>(m.dataBase64);
    const senderId = payload?.sender?.deviceId;
    if (m?.peerId && senderId) peerIdByDeviceId.set(senderId, String(m.peerId));
  } catch (error) {
    console.error('Error processing messageReceived event:', error);
  }
});

export class FileTransferService {
  private static instance: FileTransferService;
  private activeTransfers = new Map<string, TransferProgress>();
  private progressCallbacks = new Map<string, (p: TransferProgress) => void>();

  private constructor() { }

  static getInstance() {
    if (!FileTransferService.instance) FileTransferService.instance = new FileTransferService();
    return FileTransferService.instance;
  }
  
  private mapPlatformToDeviceType(platform: string): DeviceData['type'] {
    if (platform === 'ios' || platform === 'android') return 'phone';
    if (platform === 'web') return 'desktop';
    return 'unknown';
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

  async sendFiles(
    files: FileData[],
    devices: DeviceData[],
    options?: { onProgress?: (p: TransferProgress) => void; simultaneousTransfers?: number; timeout?: number; },
  ): Promise<TransferResult> {
    if (!WifiAwareCore.isNative()) return { success: false, transfers: [], errors: ['Not running in a native container.'] };
    if (!files.length || !devices.length) return { success: false, transfers: [], errors: ['No files or devices provided'] };

    const result = await WifiAwareCore.ensureAttached();
    if (!result.available) return { success: false, transfers: [], errors: [`Wi-Fi Aware unavailable: ${result.reason}`] };

    const errors: string[] = [];
    const transfers: FileTransferData[] = [];

    // Build a valid DeviceData for "my device"
    const platform = Capacitor.getPlatform() as DeviceData['platform'];
    const myDevice: DeviceData = {
      id: result.deviceId || `sender-${platform}`,
      name: result.deviceName || 'My Device',
      platform: platform || 'android',
      is_online: true,
      last_seen: new Date().toISOString(),
      type: this.mapPlatformToDeviceType(platform),
      connection_status: 'connected',
      created_date: new Date().toISOString(),
    };

    // Use the native file transfer API
    for (const device of devices) {
      const peerId = peerIdByDeviceId.get(device.id);
      if (!peerId) { 
        errors.push(`Peer not discovered for ${device.name}`); 
        continue;
      }

      for (const file of files) {
        if (!file.file) {
          errors.push(`File ${file.name} has no file data`);
          continue;
        }

        try {
          // Create progress object and notify
          const prog: TransferProgress = { 
            fileId: file.id, 
            fileName: file.name, 
            status: 'transferring', 
            progress: 0 
          };
          this.activeTransfers.set(file.id, prog);
          options?.onProgress?.(prog);

          // Convert file to base64 if needed
          const fileBase64 = await this.fileToBase64(file.file);
          
          // Send using the new native file transfer API
          const transferId = await WifiAwareCore.sendFile({
            peerId,
            fileBase64,
            fileName: file.name,
            mimeType: file.type
          });

          // Record the file transfer
          const transfer: FileTransferData = {
            id: transferId,
            filename: file.name,
            file_size: file.size,
            file_type: file.type,
            sender_device: myDevice.name,
            recipient_device: device.name,
            transfer_status: 'transferring',
            created_date: new Date().toISOString()
          };
          
          transfers.push(transfer);
          
          // Add to history
          try {
            await FileTransfer.create(transfer);
          } catch (error) {
            console.error('Failed to add transfer to history:', error);
          }
          
        } catch (e: any) {
          errors.push(`Failed to send file ${file.name} to ${device.name}: ${e?.message || String(e)}`);
          
          // Update progress with error
          const prog = this.activeTransfers.get(file.id);
          if (prog) {
            prog.status = 'failed';
            prog.error = e?.message || 'Failed to send file';
            options?.onProgress?.(prog);
          }
        }
      }
    }

    return { 
      success: errors.length === 0, 
      transfers, 
      errors 
    };
  }

  async cancelTransfer(fileId: string) {
    const t = this.activeTransfers.get(fileId);
    if (!t || t.status !== 'transferring') return false;
    
    try {
      // Try to cancel via the native API
      await getWiFiAwareBroadcastService().cancelFileTransfer(fileId);
    } catch (error) {
      console.error('Error canceling transfer:', error);
    }
    
    // Update UI state
    t.status = 'cancelled'; 
    t.progress = 0;
    this.progressCallbacks.get(fileId)?.(t);
    
    setTimeout(() => { 
      this.activeTransfers.delete(fileId); 
      this.progressCallbacks.delete(fileId); 
    }, 1000);
    
    return true;
  }

  getTransferStatus(fileId: string) { return this.activeTransfers.get(fileId); }
  getAllActiveTransfers() { return Array.from(this.activeTransfers.values()); }
  hasActiveTransfers() { return this.getAllActiveTransfers().some(t => t.status === 'transferring'); }
  onTransferProgress(fileId: string, cb: (p: TransferProgress) => void) { this.progressCallbacks.set(fileId, cb); }
  removeProgressCallback(fileId: string) { this.progressCallbacks.delete(fileId); }

  async getRecentTransfers(limit = 10) {
    return (await FileTransfer.list('-created_date')).slice(0, limit);
  }

  estimateTransferTime(fileSize: number, deviceCount: number) {
    const avg = 10 * 1024 * 1024; // 10 MB/s
    const base = fileSize / avg;
    const overhead = deviceCount > 1 ? Math.log2(deviceCount) * 0.5 : 0;
    return Math.ceil(base + overhead);
  }
}

export const getFileTransferService = () => FileTransferService.getInstance();
export const sendFilesToDevices = (files: FileData[], devices: DeviceData[], options?: Parameters<FileTransferService['sendFiles']>[2]) =>
  getFileTransferService().sendFiles(files, devices, options);
export const cancelFileTransfer = (fileId: string) => getFileTransferService().cancelTransfer(fileId);
export const getActiveTransfers = () => getFileTransferService().getAllActiveTransfers();
export const hasActiveTransfers = () => getFileTransferService().hasActiveTransfers();
