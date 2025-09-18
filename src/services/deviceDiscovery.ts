'use client';

import { WifiAwareCore, jsonFromB64 } from '@/lib/wifiAwareCore';
import { completeDeviceData } from '@/lib/deviceAdapters';
import type { DeviceData } from '@/types';
// Capacitor import removed as it's not needed

// Internal shape (what we store), not exported
type Peer = {
  peerId: string;
  distanceMm?: number;
  updatedAt: number;     // internal only
  data: DeviceData;      // finalized, UI-ready record
};

export class DeviceDiscoveryService {
  private static instance: DeviceDiscoveryService;
  private peers = new Map<string, Peer>();
  private isScanning = false;
  private scanCallbacks: Array<() => void> = [];
  private disposers: Array<{ remove: () => Promise<void> }> = [];

  private constructor() { }
  
  private mapDeviceTypeString(deviceType?: string): DeviceData['type'] {
    if (!deviceType) return 'unknown';
    
    const type = deviceType.toLowerCase();
    if (type.includes('phone') || type.includes('iphone') || type.includes('android')) return 'phone';
    if (type.includes('tablet') || type.includes('ipad')) return 'tablet';
    if (type.includes('computer') || type.includes('desktop')) return 'desktop';
    if (type.includes('laptop')) return 'laptop';
    
    return 'unknown';
  }
  
  private mapDeviceTypeToPlatform(deviceType?: string): DeviceData['platform'] {
    if (!deviceType) return 'android';
    
    const type = deviceType.toLowerCase();
    if (type.includes('iphone') || type.includes('ipad') || type.includes('ipod') || type.includes('ios')) return 'ios';
    if (type.includes('android')) return 'android';
    if (type.includes('windows')) return 'windows';
    if (type.includes('mac') || type.includes('osx')) return 'macos';
    if (type.includes('linux')) return 'linux';
    
    return 'android'; // Default fallback
  }

  static getInstance() {
    if (!DeviceDiscoveryService.instance) {
      DeviceDiscoveryService.instance = new DeviceDiscoveryService();
    }
    return DeviceDiscoveryService.instance;
  }

  async getAllDevices(sort?: '-last_seen'): Promise<DeviceData[]> {
    const list = Array.from(this.peers.values()).map(p => p.data);
    if (sort === '-last_seen') {
      return list.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
    }
    return list;
  }

  async getActiveDevices(): Promise<DeviceData[]> {
    const now = Date.now();
    const freshMs = 40_000;
    return Array.from(this.peers.values())
      .filter(p => now - p.updatedAt < freshMs)
      .map(p => p.data)
      .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
  }

  async getRecentDevices(): Promise<DeviceData[]> {
    const now = Date.now();
    const freshMs = 40_000;
    return Array.from(this.peers.values())
      .filter(p => now - p.updatedAt >= freshMs)
      .map(p => p.data)
      .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
  }

  async startScan(durationMs = 8000): Promise<DeviceData[]> {
    if (!WifiAwareCore.isNative()) return [];
    if (this.isScanning) return this.getActiveDevices();

    this.isScanning = true; this.notify();

    const ok = await WifiAwareCore.ensureAttached();
    if (!ok) { this.isScanning = false; this.notify(); return []; }

    await WifiAwareCore.subscribe();

    // Found
    this.disposers.push(
      await WifiAwareCore.on('serviceFound', async (ev) => {
        // ev: { peerId, serviceName, distanceMm?, serviceInfoBase64? }
        const peerId = String(ev.peerId);
        let name = 'Unknown';
        let platform: DeviceData['platform'] = 'android';
        let deviceId = peerId;
        let deviceType: DeviceData['type'] = 'unknown';
        let modelName: string | undefined;
        let osVersion: string | undefined;

        // First try to get device info from the native API
        try {
          if (WifiAwareCore.isNative()) {
            const deviceInfo = await WifiAwareCore.getDeviceInfo(peerId);
            if (deviceInfo) {
              name = deviceInfo.deviceName || name;
              deviceType = this.mapDeviceTypeString(deviceInfo.deviceType);
              platform = this.mapDeviceTypeToPlatform(deviceInfo.deviceType) || platform;
              modelName = deviceInfo.modelName;
              osVersion = deviceInfo.osVersion;
            }
          }
        } catch (error) {
          console.error('Error fetching device info:', error);
        }

        // Fallback to legacy info from serviceInfoBase64
        try {
          if (ev.serviceInfoBase64) {
            const info = jsonFromB64<any>(ev.serviceInfoBase64);
            name = info?.name || name;
            platform = info?.platform || platform;
            deviceId = info?.deviceId || deviceId;
          }
        } catch { }

        const now = Date.now();
        const data = completeDeviceData({
          id: deviceId,
          name,
          platform,
          type: deviceType,
          is_online: true,
          last_seen: new Date(now).toISOString(),
          modelName,
          osVersion,
        });

        this.peers.set(peerId, {
          peerId,
          distanceMm: ev.distanceMm,
          updatedAt: now,
          data,
        });

        this.notify();
      })
    );

    // Lost
    this.disposers.push(
      await WifiAwareCore.on('serviceLost', (ev) => {
        const peerId = String(ev.peerId);
        const rec = this.peers.get(peerId);
        if (!rec) return;
        const now = Date.now();
        rec.updatedAt = now;
        rec.data = {
          ...rec.data,
          is_online: false,
          last_seen: new Date(now).toISOString(),
        };
        this.notify();
      })
    );

    await new Promise(res => setTimeout(res, durationMs));
    try { await WifiAwareCore.stopAll(); } catch { }
    this.isScanning = false; this.notify();

    return this.getActiveDevices();
  }

  isCurrentlyScanning() { return this.isScanning; }

  onScanStatusChange(cb: () => void) { this.scanCallbacks.push(cb); }
  removeScanStatusCallback(cb: () => void) { this.scanCallbacks = this.scanCallbacks.filter(f => f !== cb); }

  async getDeviceStats() {
    const all = await this.getAllDevices();
    const now = Date.now();
    const freshMs = 40_000;
    const online = all.filter(d => now - new Date(d.last_seen).getTime() < freshMs).length;
    return { total: all.length, online, offline: all.length - online, lastScanTime: this.isScanning ? undefined : new Date() };
  }

  filterDevices(search: string, devices?: DeviceData[]) {
    const source = devices ?? Array.from(this.peers.values()).map(p => p.data);
    if (!search.trim()) return source;
    return source.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  }

  private notify() { this.scanCallbacks.forEach(cb => { try { cb(); } catch { } }); }
}

export const getDeviceDiscoveryService = () => DeviceDiscoveryService.getInstance();
export const getActiveDevices = () => getDeviceDiscoveryService().getActiveDevices();
export const getAllDevices = (sort?: '-last_seen') => getDeviceDiscoveryService().getAllDevices(sort);
export const startDeviceScan = (ms?: number) => getDeviceDiscoveryService().startScan(ms);
