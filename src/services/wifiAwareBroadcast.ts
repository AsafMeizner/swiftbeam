// src/services/wifiAwareBroadcast.ts
'use client';

import { WifiAwareCore, jsonFromB64 } from '@/lib/wifiAwareCore';
import { completeDeviceData } from '@/lib/deviceAdapters';
import type { DeviceData, FileData } from '@/types';
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
  private broadcastCallbacks: Array<() => void> = [];
  private requestCallbacks: Array<(r: IncomingFileRequest) => void> = [];
  private responseCallbacks: Array<(id: string, r: FileRequestResponse) => void> = [];
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

    const ok = await WifiAwareCore.ensureAttached();
    if (!ok) return false;

    // Message handler: file-request & xfer-offer
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

        if (msg?.type === 'xfer-offer' && Array.isArray(msg.files)) {
          await this.handleTransferOffer({
            fromPeerId: peerId,
            files: msg.files.map((f: any) => ({
              id: String(f.id),
              name: String(f.name),
              url: String(f.url),
              type: String(f.type ?? 'application/octet-stream'),
            })),
            messageId: msg.messageId,
          });
        }
      }),
    );

    // Publish our presence
    await WifiAwareCore.publish({
      deviceId: this.myDeviceId,
      name: this.settings.deviceName,
      platform: 'android',
      visibility: this.settings.visibility,
      allowPreview: this.settings.allowPreview,
      v: 1,
      ts: Date.now(),
    });

    this.broadcastingActive = true;
    this.notifyBroadcastCallbacks();
    return true;
  }

  async stopBroadcasting(): Promise<boolean> {
    if (!this.broadcastingActive) return true;
    try {
      await WifiAwareCore.stopAll();
      this.broadcastingActive = false;
      await Promise.allSettled(this.disposers.map(d => d.remove()));
      this.disposers = [];
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

  async respondToRequest(requestId: string, response: FileRequestResponse, _saveDir?: string) {
    const req = this.incomingRequests.get(requestId);
    if (!req) return false;
    this.notifyResponseCallbacks(requestId, response);
    if (response !== 'pending') this.incomingRequests.delete(requestId);
    return true;
  }

  getPendingRequests() { return Array.from(this.incomingRequests.values()); }
  getRequest(id: string) { return this.incomingRequests.get(id); }
  clearPendingRequests() { this.incomingRequests.clear(); }

  onBroadcastStatusChange(cb: () => void) { this.broadcastCallbacks.push(cb); }
  onIncomingRequest(cb: (r: IncomingFileRequest) => void) { this.requestCallbacks.push(cb); }
  onRequestResponse(cb: (id: string, r: FileRequestResponse) => void) { this.responseCallbacks.push(cb); }
  removeCallback(cb: () => void) { this.broadcastCallbacks = this.broadcastCallbacks.filter(f => f !== cb); }
  removeIncomingRequestCallback(cb: (r: IncomingFileRequest) => void) { this.requestCallbacks = this.requestCallbacks.filter(f => f !== cb); }
  removeRequestResponseCallback(cb: (id: string, r: FileRequestResponse) => void) {
    this.responseCallbacks = this.responseCallbacks.filter(f => f !== cb);
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
    for (const f of offer.files) {
      await this.saveHttpFile(f.url, f.name);
    }
  }

  private async saveHttpFile(url: string, filename: string) {
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
  }
}

export const getWiFiAwareBroadcastService = () => WiFiAwareBroadcastService.getInstance();
export const startBroadcasting = () => getWiFiAwareBroadcastService().startBroadcasting();
export const stopBroadcasting = () => getWiFiAwareBroadcastService().stopBroadcasting();
export const isBroadcasting = () => getWiFiAwareBroadcastService().isBroadcasting();

export const respondToFileRequest = (
  requestId: string,
  response: FileRequestResponse,
  saveLocation?: string,
) => getWiFiAwareBroadcastService().respondToRequest(requestId, response, saveLocation);
