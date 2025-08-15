'use client';

import { WifiAwareCore, jsonFromB64 } from '@/lib/wifiAwareCore';
import { completeDeviceData } from '@/lib/deviceAdapters';
import type { DeviceData } from '@/types';
import { Capacitor } from '@capacitor/core';

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
      await WifiAwareCore.on('serviceFound', (ev) => {
        // ev: { peerId, serviceName, distanceMm?, serviceInfoBase64? }
        const peerId = String(ev.peerId);
        let name = 'Unknown';
        let platform: DeviceData['platform'] = 'android';
        let deviceId = peerId;

        try {
          if (ev.serviceInfoBase64) {
            const info = jsonFromB64<any>(ev.serviceInfoBase64);
            name = info?.name ?? name;
            platform = info?.platform ?? platform;
            deviceId = info?.deviceId ?? deviceId;
          }
        } catch { }

        const now = Date.now();
        const data = completeDeviceData({
          id: deviceId,
          name,
          platform,
          is_online: true,
          last_seen: new Date(now).toISOString(),
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
