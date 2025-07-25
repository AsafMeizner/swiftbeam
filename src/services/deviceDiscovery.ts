import { Device } from "@/entities/Device";
import { DeviceData } from "@/types";

/**
 * Service for discovering and managing nearby devices
 * Currently returns mock data, can be replaced with actual device discovery logic later
 */
export class DeviceDiscoveryService {
  private static instance: DeviceDiscoveryService;
  private devices: DeviceData[] = [];
  private isScanning = false;
  private scanCallbacks: (() => void)[] = [];

  private constructor() {}

  static getInstance(): DeviceDiscoveryService {
    if (!DeviceDiscoveryService.instance) {
      DeviceDiscoveryService.instance = new DeviceDiscoveryService();
    }
    return DeviceDiscoveryService.instance;
  }

  /**
   * Get all discovered devices
   * @param sort - Sort order ("-last_seen" for newest first)
   * @returns Promise resolving to array of devices
   */
  async getAllDevices(sort?: "-last_seen"): Promise<DeviceData[]> {
    // For now, use the existing Device entity mock data
    const devices = await Device.list(sort);
    this.devices = devices;
    return devices;
  }

  /**
   * Get only devices that are currently online/active
   * @returns Promise resolving to array of online devices
   */
  async getActiveDevices(): Promise<DeviceData[]> {
    const allDevices = await this.getAllDevices("-last_seen");
    return allDevices.filter(device => device.is_online);
  }

  /**
   * Get devices that are offline but recently seen
   * @returns Promise resolving to array of offline devices
   */
  async getRecentDevices(): Promise<DeviceData[]> {
    const allDevices = await this.getAllDevices("-last_seen");
    return allDevices.filter(device => !device.is_online);
  }

  /**
   * Start scanning for nearby devices
   * @param duration - Scan duration in milliseconds (default: 2000ms)
   * @returns Promise that resolves when scan is complete
   */
  async startScan(duration: number = 2000): Promise<DeviceData[]> {
    if (this.isScanning) {
      return this.devices;
    }

    this.isScanning = true;
    this.notifyScanCallbacks();

    return new Promise((resolve) => {
      setTimeout(async () => {
        // Simulate device discovery by updating device statuses
        await this.simulateDeviceUpdate();
        
        this.isScanning = false;
        this.notifyScanCallbacks();
        
        const activeDevices = await this.getActiveDevices();
        resolve(activeDevices);
      }, duration);
    });
  }

  /**
   * Check if currently scanning for devices
   * @returns Current scanning status
   */
  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Register a callback to be notified when scan status changes
   * @param callback - Function to call when scan status changes
   */
  onScanStatusChange(callback: () => void): void {
    this.scanCallbacks.push(callback);
  }

  /**
   * Remove a scan status callback
   * @param callback - Callback function to remove
   */
  removeScanStatusCallback(callback: () => void): void {
    this.scanCallbacks = this.scanCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Simulate device status updates (for demo purposes)
   * In a real implementation, this would be replaced with actual device discovery logic
   */
  private async simulateDeviceUpdate(): Promise<void> {
    const devices = await Device.list("-last_seen");
    
    // Simulate some devices coming online/offline
    const updatedDevices = devices.map(device => ({
      ...device,
      is_online: Math.random() > 0.3, // 70% chance of being online
      last_seen: new Date().toISOString(),
    }));

    this.devices = updatedDevices;
    // Note: In a real implementation, you'd update the actual device storage here
  }

  /**
   * Filter devices by search term
   * @param searchTerm - Search term to filter by device name
   * @param devices - Optional devices array, if not provided uses current devices
   * @returns Filtered devices
   */
  filterDevices(searchTerm: string, devices?: DeviceData[]): DeviceData[] {
    const devicesToFilter = devices || this.devices;
    if (!searchTerm.trim()) {
      return devicesToFilter;
    }
    
    return devicesToFilter.filter(device =>
      device.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Get device statistics
   * @returns Object containing device counts and statistics
   */
  async getDeviceStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    lastScanTime?: Date;
  }> {
    const allDevices = await this.getAllDevices();
    const onlineDevices = allDevices.filter(d => d.is_online);
    const offlineDevices = allDevices.filter(d => !d.is_online);

    return {
      total: allDevices.length,
      online: onlineDevices.length,
      offline: offlineDevices.length,
      lastScanTime: this.isScanning ? undefined : new Date()
    };
  }

  private notifyScanCallbacks(): void {
    this.scanCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in scan status callback:', error);
      }
    });
  }
}

// Export a convenience function for getting the service instance
export const getDeviceDiscoveryService = () => DeviceDiscoveryService.getInstance();

// Export convenience functions for common operations
export const getActiveDevices = () => getDeviceDiscoveryService().getActiveDevices();
export const getAllDevices = (sort?: "-last_seen") => getDeviceDiscoveryService().getAllDevices(sort);
export const startDeviceScan = (duration?: number) => getDeviceDiscoveryService().startScan(duration);
