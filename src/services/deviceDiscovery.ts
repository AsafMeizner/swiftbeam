'use client';

import { WifiAwareCore, jsonFromB64 } from '@/lib/wifiAwareCore';
import { completeDeviceData } from '@/lib/deviceAdapters';
import type { DeviceData } from '@/types';

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
  
  private normalizeDevicePlatform(platform?: string): DeviceData['platform'] {
    if (!platform) return 'android';
    
    const p = platform.toLowerCase();
    if (p.includes('ios')) return 'ios';
    if (p.includes('android')) return 'android';
    if (p.includes('windows')) return 'windows';
    if (p.includes('mac') || p.includes('osx')) return 'macos';
    if (p.includes('linux')) return 'linux';
    
    return p as DeviceData['platform'];
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

  private async cleanupDisposers() {
    if (this.disposers.length > 0) {
      // Remove all event listeners
      await Promise.allSettled(this.disposers.map(d => d.remove()));
      this.disposers = [];
    }
  }

  private async setupEventHandlers() {
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
            console.log(`Attempting to get device info for peer ${peerId}`);
            const deviceInfo = await WifiAwareCore.getDeviceInfo(peerId);
            console.log('Device info received:', JSON.stringify(deviceInfo));
            
            if (deviceInfo) {
              // Extract all available device information
              name = deviceInfo.deviceName || name;
              
              if (deviceInfo.deviceType) {
                deviceType = this.mapDeviceTypeString(deviceInfo.deviceType);
                platform = this.mapDeviceTypeToPlatform(deviceInfo.deviceType);
                console.log(`Mapped device type: ${deviceType}, platform: ${platform}`);
              }
              
              // Additional info for better display
              modelName = deviceInfo.modelName;
              osVersion = deviceInfo.osVersion;
              
              // Handle any custom properties that might be in the device info object
              const deviceInfoAny = deviceInfo as any;
              if (deviceInfoAny.platform) {
                platform = this.normalizeDevicePlatform(deviceInfoAny.platform);
                console.log(`Using direct platform info: ${platform}`);
              }
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
  }

  async startScan(durationMs = 8000): Promise<DeviceData[]> {
    if (!WifiAwareCore.isNative()) return [];
    if (this.isScanning) return this.getActiveDevices();

    // Clean up any previous disposers before starting new scan
    await this.cleanupDisposers();
    
    this.isScanning = true; 
    this.notify();
    
    // Clear old peers that haven't been updated recently
    const now = Date.now();
    const staleMs = 120_000; // 2 minutes
    this.peers.forEach((peer, key) => {
      if (now - peer.updatedAt > staleMs) {
        this.peers.delete(key);
      }
    });

    // Make multiple attempts to ensure discovery works
    const maxAttempts = 3;
    let attempt = 0;
    let success = false;
    
    while (attempt < maxAttempts && !success) {
      attempt++;
      console.log(`WiFi Aware discovery attempt ${attempt}/${maxAttempts}`);
      
      try {
        const result = await WifiAwareCore.ensureAttached();
        if (!result.available) {
          console.log(`WiFi Aware attach failed, retrying... (${result.reason || 'unknown reason'})`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        
        success = true;
        
        // Stop any previous subscriptions to ensure clean state
        try { 
          await WifiAwareCore.stopAll(); // This will stop subscription
          await new Promise(r => setTimeout(r, 300)); // Give time to stop
        } catch (e) { 
          console.log("Error stopping previous subscription:", e);
        }
        
        // Start a new subscription with enhanced parameters
        await WifiAwareCore.subscribe();
        
        // Set up event handlers for discovery
        await this.setupEventHandlers();
        
        break; // Exit the while loop as we've succeeded
      } catch (error) {
        console.error("Error during WiFi Aware discovery attempt:", error);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    // Wait for the scan duration regardless of success
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    // Mark scanning as complete
    this.isScanning = false;
    this.notify();
    
    // Return discovered devices
    return this.getActiveDevices();
  }

  isCurrentlyScanning(): boolean { 
    return this.isScanning; 
  }

  onScanStatusChange(cb: () => void): void { 
    this.scanCallbacks.push(cb); 
  }
  
  removeScanStatusCallback(cb: () => void): void { 
    this.scanCallbacks = this.scanCallbacks.filter(f => f !== cb); 
  }

  async getDeviceStats() {
    const all = await this.getAllDevices();
    const now = Date.now();
    const freshMs = 40_000;
    const online = all.filter(d => now - new Date(d.last_seen).getTime() < freshMs).length;
    return { total: all.length, online, offline: all.length - online, lastScanTime: this.isScanning ? undefined : new Date() };
  }

  filterDevices(search: string, devices?: DeviceData[]): DeviceData[] {
    const source = devices ?? Array.from(this.peers.values()).map(p => p.data);
    if (!search.trim()) return source;
    return source.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  }

  private notify(): void { 
    this.scanCallbacks.forEach(cb => { try { cb(); } catch { } }); 
  }
}

export const getDeviceDiscoveryService = () => DeviceDiscoveryService.getInstance();
export const getActiveDevices = () => getDeviceDiscoveryService().getActiveDevices();
export const getAllDevices = (sort?: '-last_seen') => getDeviceDiscoveryService().getAllDevices(sort);
export const startDeviceScan = (ms?: number) => getDeviceDiscoveryService().startScan(ms);