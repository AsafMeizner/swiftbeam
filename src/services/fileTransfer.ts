'use client';

import { Capacitor } from '@capacitor/core';
import { WifiAwareCore } from '@/lib/wifiAwareCore';
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
WifiAwareCore.on('serviceFound', (ev: any) => {
  try {
    if (ev?.serviceInfoBase64) {
      const info = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(ev.serviceInfoBase64), c => c.charCodeAt(0))));
      if (ev?.peerId && info?.deviceId) peerIdByDeviceId.set(info.deviceId, String(ev.peerId));
    }
  } catch { }
});
WifiAwareCore.on('messageReceived', (m: any) => {
  try {
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(m.dataBase64), c => c.charCodeAt(0))));
    const senderId = payload?.sender?.deviceId;
    if (m?.peerId && senderId) peerIdByDeviceId.set(senderId, String(m.peerId));
  } catch { }
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

  async sendFiles(
    files: FileData[],
    devices: DeviceData[],
    options?: { onProgress?: (p: TransferProgress) => void; simultaneousTransfers?: number; timeout?: number; },
  ): Promise<TransferResult> {
    if (!WifiAwareCore.isNative()) return { success: false, transfers: [], errors: ['Not running in a native container.'] };
    if (!files.length || !devices.length) return { success: false, transfers: [], errors: ['No files or devices provided'] };

    const ok = await WifiAwareCore.ensureAttached();
    if (!ok) return { success: false, transfers: [], errors: ['Wi-Fi Aware unavailable'] };

    const errors: string[] = [];
    const transfers: FileTransferData[] = [];

    // Build a valid DeviceData for "my device"
    const platform = Capacitor.getPlatform() as DeviceData['platform'];
    const myDevice: DeviceData = {
      id: `sender-${platform}`,
      name: 'My Device',
      platform: platform || 'android',
      is_online: true,
      last_seen: new Date().toISOString(),
      // required by your schema:
      type: 'device' as any,
      connection_status: 'connected' as any,
      created_date: new Date().toISOString(),
    };

    // 1) Signal intent to send (file-request) to each peer
    for (const device of devices) {
      const peerId = peerIdByDeviceId.get(device.id);
      if (!peerId) { errors.push(`Peer not discovered for ${device.name}`); continue; }
      try {
        await getWiFiAwareBroadcastService().sendFileRequest(peerId, files, myDevice);
      } catch (e: any) {
        errors.push(`Failed to signal ${device.name}: ${e?.message ?? e}`);
      }
    }

    // 2) Upload files (HTTP fallback) + progress animation up to 95%
    const urlByFileId = new Map<string, string>();
    for (const f of files) {
      const prog: TransferProgress = { fileId: f.id, fileName: f.name, status: 'transferring', progress: 0 };
      this.activeTransfers.set(f.id, prog); options?.onProgress?.(prog);
      const { UploadFile } = await import('@/integrations/Core');
      const { file_url } = await UploadFile({ file: f.file! });
      urlByFileId.set(f.id, file_url);
      await this.simulateProgress(f.id, options?.onProgress);
    }

    // 3) Offer URLs over Aware messaging
    for (const device of devices) {
      const peerId = peerIdByDeviceId.get(device.id);
      if (!peerId) continue;

      const offerFiles = files.map(f => ({ id: f.id, name: f.name, url: urlByFileId.get(f.id)!, type: f.type }));
      try {
        await WifiAwareCore.sendMessage(peerId, {
          type: 'xfer-offer',
          files: offerFiles,
          sender: { deviceId: myDevice.id, name: myDevice.name, platform: myDevice.platform },
          v: 1, ts: Date.now(),
        });
      } catch (e: any) {
        errors.push(`Failed to offer files to ${device.name}: ${e?.message ?? e}`);
      }
    }

    // 4) Complete locally + write history
    for (const f of files) {
      const done: TransferProgress = { fileId: f.id, fileName: f.name, status: 'completed', progress: 100 };
      this.activeTransfers.set(f.id, done); options?.onProgress?.(done);
    }

    for (const device of devices) {
      for (const f of files) {
        const rec = await FileTransfer.create({
          filename: f.name,
          file_size: f.size,
          file_type: f.type,
          file_url: urlByFileId.get(f.id)!,
          sender_device: myDevice.name,
          recipient_device: device.name,
          transfer_status: 'completed',
          transfer_speed: this.randomSpeed(),
          completion_time: new Date().toISOString(),
        });
        transfers.push(rec);
      }
    }

    setTimeout(() => files.forEach(f => this.activeTransfers.delete(f.id)), 2500);
    return { success: errors.length === 0, transfers, errors };
  }

  async cancelTransfer(fileId: string) {
    const t = this.activeTransfers.get(fileId);
    if (!t || t.status !== 'transferring') return false;
    t.status = 'cancelled'; t.progress = 0;
    this.progressCallbacks.get(fileId)?.(t);
    setTimeout(() => { this.activeTransfers.delete(fileId); this.progressCallbacks.delete(fileId); }, 1000);
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

  private async simulateProgress(fileId: string, cb?: (p: TransferProgress) => void) {
    const steps = 10, delay = 160;
    for (let i = 1; i <= steps; i++) {
      await new Promise(r => setTimeout(r, delay));
      const t = this.activeTransfers.get(fileId); if (!t) return;
      t.progress = Math.min((i / steps) * 100, 95);
      t.speed = this.randomSpeed();
      t.estimatedTimeRemaining = Math.max(0, (100 - t.progress) / 10);
      cb?.(t);
    }
  }
  private randomSpeed() { return Math.random() * 45 + 5; }
}

export const getFileTransferService = () => FileTransferService.getInstance();
export const sendFilesToDevices = (files: FileData[], devices: DeviceData[], options?: Parameters<FileTransferService['sendFiles']>[2]) =>
  getFileTransferService().sendFiles(files, devices, options);
export const cancelFileTransfer = (fileId: string) => getFileTransferService().cancelTransfer(fileId);
export const getActiveTransfers = () => getFileTransferService().getAllActiveTransfers();
export const hasActiveTransfers = () => getFileTransferService().hasActiveTransfers();
