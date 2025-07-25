import { DeviceData, FileData } from "@/types";

export interface IncomingFileRequest {
  id: string;
  senderDevice: DeviceData;
  files: {
    id: string;
    name: string;
    size: number;
    type: string;
    preview?: string; // Base64 preview for images
  }[];
  timestamp: Date;
  message?: string; // Optional message from sender
  estimatedTransferTime: number; // in seconds
}

export interface BroadcastSettings {
  enabled: boolean;
  deviceName: string;
  visibility: "everyone" | "contacts" | "off";
  autoAcceptFromTrustedDevices: boolean;
  allowPreview: boolean;
  maxFileSize: number; // in bytes
}

export type FileRequestResponse = "accept" | "decline" | "pending";

/**
 * Service for WiFi Aware broadcasting and receiving file requests
 * Handles device availability broadcasting and incoming file request management
 */
export class WiFiAwareBroadcastService {
  private static instance: WiFiAwareBroadcastService;
  private broadcastingActive = false;
  private settings: BroadcastSettings = {
    enabled: false,
    deviceName: "My Device",
    visibility: "everyone",
    autoAcceptFromTrustedDevices: false,
    allowPreview: true,
    maxFileSize: 100 * 1024 * 1024 // 100MB default
  };
  
  private incomingRequests = new Map<string, IncomingFileRequest>();
  private broadcastCallbacks: (() => void)[] = [];
  private requestCallbacks: ((request: IncomingFileRequest) => void)[] = [];
  private responseCallbacks: ((requestId: string, response: FileRequestResponse) => void)[] = [];

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): WiFiAwareBroadcastService {
    if (!WiFiAwareBroadcastService.instance) {
      WiFiAwareBroadcastService.instance = new WiFiAwareBroadcastService();
    }
    return WiFiAwareBroadcastService.instance;
  }

  /**
   * Start broadcasting device availability for file sharing
   * @returns Promise that resolves when broadcasting starts
   */
  async startBroadcasting(): Promise<boolean> {
    if (!this.settings.enabled) {
      console.warn("Broadcasting is disabled in settings");
      return false;
    }

    if (this.broadcastingActive) {
      return true;
    }

    try {
      // In real implementation, this would:
      // 1. Initialize WiFi Aware session
      // 2. Start publishing service with device info
      // 3. Set up discovery listeners
      
      this.broadcastingActive = true;
      console.log(`Started broadcasting as "${this.settings.deviceName}"`);
      
      // Simulate WiFi Aware broadcasting
      this.simulateBroadcastingSetup();
      
      this.notifyBroadcastCallbacks();
      return true;
    } catch (error) {
      console.error("Failed to start broadcasting:", error);
      return false;
    }
  }

  /**
   * Stop broadcasting device availability
   * @returns Promise that resolves when broadcasting stops
   */
  async stopBroadcasting(): Promise<boolean> {
    if (!this.broadcastingActive) {
      return true;
    }

    try {
      // In real implementation, this would:
      // 1. Stop WiFi Aware publishing
      // 2. Clean up discovery listeners
      // 3. Close WiFi Aware session
      
      this.broadcastingActive = false;
      console.log("Stopped broadcasting");
      
      this.notifyBroadcastCallbacks();
      return true;
    } catch (error) {
      console.error("Failed to stop broadcasting:", error);
      return false;
    }
  }

  /**
   * Check if currently broadcasting
   */
  isBroadcasting(): boolean {
    return this.broadcastingActive;
  }

  /**
   * Update broadcast settings
   * @param newSettings - New settings to apply
   */
  async updateSettings(newSettings: Partial<BroadcastSettings>): Promise<void> {
    const oldEnabled = this.settings.enabled;
    this.settings = { ...this.settings, ...newSettings };
    
    // Save to storage (localStorage for now, could be replaced with proper storage)
    localStorage.setItem('wifiAwareBroadcastSettings', JSON.stringify(this.settings));
    
    // Restart broadcasting if enabled state changed
    if (oldEnabled !== this.settings.enabled) {
      if (this.settings.enabled) {
        await this.startBroadcasting();
      } else {
        await this.stopBroadcasting();
      }
    } else if (this.broadcastingActive && this.settings.enabled) {
      // Restart broadcasting to apply new settings
      await this.stopBroadcasting();
      await this.startBroadcasting();
    }
  }

  /**
   * Get current broadcast settings
   */
  getSettings(): BroadcastSettings {
    return { ...this.settings };
  }

  /**
   * Simulate receiving an incoming file request (for testing)
   * @param senderDevice - Device sending the files
   * @param files - Files being sent
   * @param message - Optional message from sender
   */
  simulateIncomingRequest(
    senderDevice: DeviceData,
    files: FileData[],
    message?: string
  ): string {
    const requestId = crypto.randomUUID();
    
    const request: IncomingFileRequest = {
      id: requestId,
      senderDevice,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith('image/') ? this.generateMockPreview() : undefined
      })),
      timestamp: new Date(),
      message,
      estimatedTransferTime: this.calculateEstimatedTime(files)
    };

    this.incomingRequests.set(requestId, request);
    
    // Notify listeners
    this.notifyRequestCallbacks(request);
    
    console.log(`Simulated incoming file request from ${senderDevice.name}:`, files.map(f => f.name));
    return requestId;
  }

  /**
   * Respond to an incoming file request
   * @param requestId - ID of the request to respond to
   * @param response - Accept or decline the request
   * @param saveLocation - Optional save location for accepted files
   */
  async respondToRequest(
    requestId: string,
    response: FileRequestResponse,
    saveLocation?: string
  ): Promise<boolean> {
    const request = this.incomingRequests.get(requestId);
    if (!request) {
      console.error("Request not found:", requestId);
      return false;
    }

    try {
      if (response === "accept") {
        console.log(`Accepted file request from ${request.senderDevice.name}`);
        
        // In real implementation, this would:
        // 1. Send acceptance response via WiFi Aware
        // 2. Set up file receiving endpoints
        // 3. Start file transfer process
        
        // For now, simulate acceptance
        this.simulateFileReception(request, saveLocation);
      } else if (response === "decline") {
        console.log(`Declined file request from ${request.senderDevice.name}`);
        
        // In real implementation, send decline response via WiFi Aware
      }

      // Notify response callbacks
      this.notifyResponseCallbacks(requestId, response);
      
      // Remove request after response (except for pending)
      if (response !== "pending") {
        this.incomingRequests.delete(requestId);
      }

      return true;
    } catch (error) {
      console.error("Failed to respond to request:", error);
      return false;
    }
  }

  /**
   * Get all pending incoming requests
   */
  getPendingRequests(): IncomingFileRequest[] {
    return Array.from(this.incomingRequests.values());
  }

  /**
   * Get a specific request by ID
   */
  getRequest(requestId: string): IncomingFileRequest | undefined {
    return this.incomingRequests.get(requestId);
  }

  /**
   * Clear all pending requests
   */
  clearPendingRequests(): void {
    this.incomingRequests.clear();
  }

  /**
   * Register callback for broadcast status changes
   */
  onBroadcastStatusChange(callback: () => void): void {
    this.broadcastCallbacks.push(callback);
  }

  /**
   * Register callback for incoming file requests
   */
  onIncomingRequest(callback: (request: IncomingFileRequest) => void): void {
    this.requestCallbacks.push(callback);
  }

  /**
   * Register callback for request responses
   */
  onRequestResponse(callback: (requestId: string, response: FileRequestResponse) => void): void {
    this.responseCallbacks.push(callback);
  }

  /**
   * Remove callback
   */
  removeCallback(callback: () => void): void {
    this.broadcastCallbacks = this.broadcastCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Remove incoming request callback
   */
  removeIncomingRequestCallback(callback: (request: IncomingFileRequest) => void): void {
    this.requestCallbacks = this.requestCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Remove request response callback
   */
  removeRequestResponseCallback(callback: (requestId: string, response: FileRequestResponse) => void): void {
    this.responseCallbacks = this.responseCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Check if device can receive files based on settings
   */
  canReceiveFiles(): boolean {
    return this.settings.enabled && this.settings.visibility !== "off";
  }

  /**
   * Get device visibility status for other devices
   */
  getVisibilityStatus(): string {
    if (!this.settings.enabled) return "Hidden";
    if (!this.broadcastingActive) return "Available (Not Broadcasting)";
    
    switch (this.settings.visibility) {
      case "everyone": return "Visible to Everyone";
      case "contacts": return "Visible to Contacts Only";
      case "off": return "Hidden";
      default: return "Unknown";
    }
  }

  // Private methods

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('wifiAwareBroadcastSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error("Failed to load broadcast settings:", error);
    }
  }

  private simulateBroadcastingSetup(): void {
    // Simulate the setup process that would happen with real WiFi Aware
    setTimeout(() => {
      console.log("WiFi Aware session established");
      console.log(`Publishing service: ${this.settings.deviceName}`);
      console.log(`Visibility: ${this.settings.visibility}`);
    }, 100);
  }

  private calculateEstimatedTime(files: FileData[]): number {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    // Assume average WiFi Aware transfer speed of 20 MB/s
    const avgSpeed = 20 * 1024 * 1024;
    return Math.ceil(totalSize / avgSpeed);
  }

  private generateMockPreview(): string {
    // Generate a simple mock base64 preview (tiny colored square)
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  }

  private simulateFileReception(request: IncomingFileRequest, saveLocation?: string): void {
    // Simulate the file reception process
    console.log(`Starting file reception from ${request.senderDevice.name}`);
    console.log(`Files: ${request.files.map(f => f.name).join(", ")}`);
    if (saveLocation) {
      console.log(`Save location: ${saveLocation}`);
    }
    
    // In real implementation, this would:
    // 1. Set up WiFi Aware data session
    // 2. Create file receiving streams
    // 3. Handle incoming file data
    // 4. Save files to specified location
    // 5. Notify completion
  }

  private notifyBroadcastCallbacks(): void {
    this.broadcastCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error in broadcast callback:", error);
      }
    });
  }

  private notifyRequestCallbacks(request: IncomingFileRequest): void {
    this.requestCallbacks.forEach(callback => {
      try {
        callback(request);
      } catch (error) {
        console.error("Error in request callback:", error);
      }
    });
  }

  private notifyResponseCallbacks(requestId: string, response: FileRequestResponse): void {
    this.responseCallbacks.forEach(callback => {
      try {
        callback(requestId, response);
      } catch (error) {
        console.error("Error in response callback:", error);
      }
    });
  }
}

// Export convenience functions
export const getWiFiAwareBroadcastService = () => WiFiAwareBroadcastService.getInstance();

export const startBroadcasting = () => getWiFiAwareBroadcastService().startBroadcasting();
export const stopBroadcasting = () => getWiFiAwareBroadcastService().stopBroadcasting();
export const isBroadcasting = () => getWiFiAwareBroadcastService().isBroadcasting();

export const simulateIncomingFileRequest = (
  senderDevice: DeviceData,
  files: FileData[],
  message?: string
) => getWiFiAwareBroadcastService().simulateIncomingRequest(senderDevice, files, message);

export const respondToFileRequest = (
  requestId: string,
  response: FileRequestResponse,
  saveLocation?: string
) => getWiFiAwareBroadcastService().respondToRequest(requestId, response, saveLocation);
