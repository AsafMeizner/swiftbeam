import { FileTransfer } from "@/entities/FileTransfer";
import { UploadFile } from "@/integrations/Core";
import { DeviceData, FileData, FileTransferData } from "@/types";

export type TransferStatus = "pending" | "transferring" | "completed" | "failed" | "cancelled";

export interface TransferProgress {
  fileId: string;
  fileName: string;
  status: TransferStatus;
  progress: number; // 0-100
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  error?: string;
}

export interface TransferResult {
  success: boolean;
  transfers: FileTransferData[];
  errors: string[];
}

/**
 * Service for handling file transfers to multiple devices
 * Currently uses mock transfer logic, can be replaced with actual transfer implementation later
 */
export class FileTransferService {
  private static instance: FileTransferService;
  private activeTransfers: Map<string, TransferProgress> = new Map();
  private progressCallbacks: Map<string, (progress: TransferProgress) => void> = new Map();

  private constructor() {}

  static getInstance(): FileTransferService {
    if (!FileTransferService.instance) {
      FileTransferService.instance = new FileTransferService();
    }
    return FileTransferService.instance;
  }

  /**
   * Send files to multiple devices
   * @param files - Array of files to send
   * @param devices - Array of target devices
   * @param options - Transfer options
   * @returns Promise resolving to transfer results
   */
  async sendFiles(
    files: FileData[],
    devices: DeviceData[],
    options?: {
      onProgress?: (progress: TransferProgress) => void;
      simultaneousTransfers?: number;
      timeout?: number;
    }
  ): Promise<TransferResult> {
    if (files.length === 0 || devices.length === 0) {
      return {
        success: false,
        transfers: [],
        errors: ["No files or devices provided"]
      };
    }

    const transfers: FileTransferData[] = [];
    const errors: string[] = [];
    const simultaneousTransfers = options?.simultaneousTransfers || 3;

    try {
      // Process files in batches to avoid overwhelming the system
      for (let i = 0; i < files.length; i += simultaneousTransfers) {
        const fileBatch = files.slice(i, i + simultaneousTransfers);
        
        const batchPromises = fileBatch.map(async (file) => {
          try {
            const fileTransfers = await this.sendFileToDevices(file, devices, options?.onProgress);
            transfers.push(...fileTransfers);
          } catch (error) {
            const errorMessage = `Failed to send ${file.name}: ${error instanceof Error ? error.message : String(error)}`;
            errors.push(errorMessage);
            console.error("File transfer error:", error);
          }
        });

        await Promise.allSettled(batchPromises);
      }

      return {
        success: errors.length === 0,
        transfers,
        errors
      };
    } catch (error) {
      return {
        success: false,
        transfers,
        errors: [...errors, `Transfer failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Send a single file to multiple devices
   * @param file - File to send
   * @param devices - Target devices
   * @param onProgress - Progress callback
   * @returns Promise resolving to transfer records
   */
  private async sendFileToDevices(
    file: FileData,
    devices: DeviceData[],
    onProgress?: (progress: TransferProgress) => void
  ): Promise<FileTransferData[]> {
    const transfers: FileTransferData[] = [];

    // Update file status to transferring
    const progressData: TransferProgress = {
      fileId: file.id,
      fileName: file.name,
      status: "transferring",
      progress: 0
    };

    this.activeTransfers.set(file.id, progressData);
    if (onProgress) {
      onProgress(progressData);
    }

    try {
      // Simulate file upload (in real implementation, this might upload to a staging area)
      const { file_url } = await UploadFile({ file: file.file! });

      // Simulate transfer progress
      await this.simulateTransferProgress(file.id, onProgress);

      // Create transfer records for each device
      for (const device of devices) {
        const transferRecord = await FileTransfer.create({
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url,
          sender_device: "My Device", // In real implementation, get from user settings
          recipient_device: device.name,
          transfer_status: "completed",
          transfer_speed: this.generateRandomSpeed(),
          completion_time: new Date().toISOString()
        });

        transfers.push(transferRecord);
      }

      // Update to completed
      const completedProgress: TransferProgress = {
        fileId: file.id,
        fileName: file.name,
        status: "completed",
        progress: 100
      };

      this.activeTransfers.set(file.id, completedProgress);
      if (onProgress) {
        onProgress(completedProgress);
      }

      // Clean up after a delay
      setTimeout(() => {
        this.activeTransfers.delete(file.id);
      }, 5000);

      return transfers;
    } catch (error) {
      // Update to failed
      const failedProgress: TransferProgress = {
        fileId: file.id,
        fileName: file.name,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : String(error)
      };

      this.activeTransfers.set(file.id, failedProgress);
      if (onProgress) {
        onProgress(failedProgress);
      }

      throw error;
    }
  }

  /**
   * Simulate transfer progress (for demo purposes)
   * In real implementation, this would track actual transfer progress
   */
  private async simulateTransferProgress(
    fileId: string,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<void> {
    const steps = 10;
    const delay = 200; // ms between progress updates

    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const progress = Math.min((i / steps) * 100, 95); // Don't reach 100% until actually complete
      const transferProgress = this.activeTransfers.get(fileId);
      
      if (transferProgress) {
        transferProgress.progress = progress;
        transferProgress.speed = this.generateRandomSpeed();
        transferProgress.estimatedTimeRemaining = Math.max(0, (100 - progress) / 10);
        
        if (onProgress) {
          onProgress(transferProgress);
        }
      }
    }
  }

  /**
   * Cancel an active transfer
   * @param fileId - ID of the file transfer to cancel
   * @returns Success status
   */
  async cancelTransfer(fileId: string): Promise<boolean> {
    const transfer = this.activeTransfers.get(fileId);
    if (!transfer) {
      return false;
    }

    if (transfer.status === "transferring") {
      transfer.status = "cancelled";
      transfer.progress = 0;
      
      const progressCallback = this.progressCallbacks.get(fileId);
      if (progressCallback) {
        progressCallback(transfer);
      }

      // Clean up
      setTimeout(() => {
        this.activeTransfers.delete(fileId);
        this.progressCallbacks.delete(fileId);
      }, 1000);

      return true;
    }

    return false;
  }

  /**
   * Get the current status of a transfer
   * @param fileId - File ID to check status for
   * @returns Transfer progress or undefined if not found
   */
  getTransferStatus(fileId: string): TransferProgress | undefined {
    return this.activeTransfers.get(fileId);
  }

  /**
   * Get all active transfers
   * @returns Array of active transfer progress
   */
  getAllActiveTransfers(): TransferProgress[] {
    return Array.from(this.activeTransfers.values());
  }

  /**
   * Check if any transfers are currently active
   * @returns True if transfers are active
   */
  hasActiveTransfers(): boolean {
    return Array.from(this.activeTransfers.values()).some(
      transfer => transfer.status === "transferring"
    );
  }

  /**
   * Register a progress callback for a specific transfer
   * @param fileId - File ID to monitor
   * @param callback - Progress callback function
   */
  onTransferProgress(fileId: string, callback: (progress: TransferProgress) => void): void {
    this.progressCallbacks.set(fileId, callback);
  }

  /**
   * Remove a progress callback
   * @param fileId - File ID to stop monitoring
   */
  removeProgressCallback(fileId: string): void {
    this.progressCallbacks.delete(fileId);
  }

  /**
   * Get recent completed transfers
   * @param limit - Maximum number of transfers to return
   * @returns Promise resolving to recent transfers
   */
  async getRecentTransfers(limit: number = 10): Promise<FileTransferData[]> {
    return await FileTransfer.list("-created_date").then(transfers => 
      transfers.slice(0, limit)
    );
  }

  /**
   * Calculate estimated transfer time
   * @param fileSize - Size of file in bytes
   * @param deviceCount - Number of target devices
   * @returns Estimated time in seconds
   */
  estimateTransferTime(fileSize: number, deviceCount: number): number {
    // Simple estimation: assume average speed of 10 MB/s per device
    const avgSpeedPerDevice = 10 * 1024 * 1024; // 10 MB/s in bytes
    const baseTime = fileSize / avgSpeedPerDevice;
    
    // Add overhead for multiple devices (not perfectly parallel)
    const overhead = deviceCount > 1 ? Math.log2(deviceCount) * 0.5 : 0;
    
    return Math.ceil(baseTime + overhead);
  }

  /**
   * Generate random transfer speed for simulation
   */
  private generateRandomSpeed(): number {
    // Random speed between 5-50 MB/s
    return Math.random() * 45 + 5;
  }
}

// Export convenience functions
export const getFileTransferService = () => FileTransferService.getInstance();

export const sendFilesToDevices = (
  files: FileData[],
  devices: DeviceData[],
  options?: Parameters<FileTransferService['sendFiles']>[2]
) => getFileTransferService().sendFiles(files, devices, options);

export const cancelFileTransfer = (fileId: string) => 
  getFileTransferService().cancelTransfer(fileId);

export const getActiveTransfers = () => 
  getFileTransferService().getAllActiveTransfers();

export const hasActiveTransfers = () => 
  getFileTransferService().hasActiveTransfers();
