/**
 * Example usage of the Device Discovery and File Transfer services
 * 
 * This file demonstrates how to use the refactored services for:
 * 1. Getting nearby/active devices
 * 2. Sending files to multiple devices
 * 3. Tracking transfer progress
 */

import { getActiveDevices, startDeviceScan, getDeviceDiscoveryService } from '@/services/deviceDiscovery';
import { sendFilesToDevices, getFileTransferService, hasActiveTransfers } from '@/services/fileTransfer';
import { FileData, DeviceData } from '@/types';

// Example 1: Get currently active devices
export async function getAvailableDevices(): Promise<DeviceData[]> {
  try {
    // Get devices that are currently online
    const activeDevices = await getActiveDevices();
    console.log('Active devices found:', activeDevices.length);
    return activeDevices;
  } catch (error) {
    console.error('Failed to get active devices:', error);
    return [];
  }
}

// Example 2: Scan for new devices
export async function scanForNearbyDevices(): Promise<DeviceData[]> {
  try {
    console.log('Starting device scan...');
    const foundDevices = await startDeviceScan(3000); // 3 second scan
    console.log('Scan completed. Found devices:', foundDevices.length);
    return foundDevices;
  } catch (error) {
    console.error('Device scan failed:', error);
    return [];
  }
}

// Example 3: Send files to devices with progress tracking
export async function sendFilesToNearbyDevices(
  files: File[], 
  targetDeviceIds?: string[]
): Promise<boolean> {
  try {
    // Get active devices
    const activeDevices = await getActiveDevices();
    
    // Filter devices if specific IDs provided
    const targetDevices = targetDeviceIds 
      ? activeDevices.filter(device => targetDeviceIds.includes(device.id))
      : activeDevices;
    
    if (targetDevices.length === 0) {
      console.warn('No target devices available');
      return false;
    }

    // Convert File objects to FileData format
    const fileData: FileData[] = files.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      file: file,
      status: 'ready'
    }));

    console.log(`Sending ${files.length} files to ${targetDevices.length} devices...`);

    // Send files with progress tracking
    const result = await sendFilesToDevices(fileData, targetDevices, {
      onProgress: (progress) => {
        console.log(`File: ${progress.fileName}, Progress: ${progress.progress}%, Status: ${progress.status}`);
        
        // You can update your UI here with the progress information
        if (progress.speed) {
          console.log(`Transfer speed: ${(progress.speed / 1024 / 1024).toFixed(2)} MB/s`);
        }
        
        if (progress.estimatedTimeRemaining) {
          console.log(`ETA: ${progress.estimatedTimeRemaining}s`);
        }
      },
      simultaneousTransfers: 2, // Transfer 2 files at once
      timeout: 30000 // 30 second timeout
    });

    if (result.success) {
      console.log('All files transferred successfully!');
      console.log('Transfer records:', result.transfers);
      return true;
    } else {
      console.error('Some transfers failed:', result.errors);
      return false;
    }

  } catch (error) {
    console.error('File transfer failed:', error);
    return false;
  }
}

// Example 4: Monitor transfer status
export function setupTransferMonitoring(): void {
  const transferService = getFileTransferService();
  
  // Check for active transfers every second
  const interval = setInterval(() => {
    if (hasActiveTransfers()) {
      const activeTransfers = transferService.getAllActiveTransfers();
      console.log('Active transfers:', activeTransfers.length);
      
      activeTransfers.forEach(transfer => {
        console.log(`- ${transfer.fileName}: ${transfer.progress}% (${transfer.status})`);
      });
    } else {
      console.log('No active transfers');
      clearInterval(interval); // Stop monitoring when no transfers
    }
  }, 1000);
}

// Example 5: Get device statistics
export async function getDeviceStatistics(): Promise<void> {
  const deviceService = getDeviceDiscoveryService();
  const stats = await deviceService.getDeviceStats();
  
  console.log('Device Statistics:');
  console.log(`- Total devices: ${stats.total}`);
  console.log(`- Online devices: ${stats.online}`);
  console.log(`- Offline devices: ${stats.offline}`);
  if (stats.lastScanTime) {
    console.log(`- Last scan: ${stats.lastScanTime.toLocaleString()}`);
  }
}

// Example 6: Advanced usage - Custom progress handling
export async function sendWithCustomProgress(
  files: File[],
  devices: DeviceData[]
): Promise<void> {
  const fileData: FileData[] = files.map(file => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    file: file,
    status: 'ready'
  }));

  // Track progress for each file
  const progressMap = new Map<string, number>();

  await sendFilesToDevices(fileData, devices, {
    onProgress: (progress) => {
      progressMap.set(progress.fileId, progress.progress);
      
      // Calculate overall progress
      const totalProgress = Array.from(progressMap.values()).reduce((sum, p) => sum + p, 0);
      const averageProgress = totalProgress / progressMap.size;
      
      console.log(`Overall Progress: ${averageProgress.toFixed(1)}%`);
      
      // Handle different states
      switch (progress.status) {
        case 'transferring':
          console.log(`📤 Transferring ${progress.fileName}...`);
          break;
        case 'completed':
          console.log(`✅ Completed ${progress.fileName}`);
          break;
        case 'failed':
          console.error(`❌ Failed ${progress.fileName}: ${progress.error}`);
          break;
      }
    }
  });
}

// Example usage in a React component:
/*
import { useEffect, useState } from 'react';
import { getAvailableDevices, sendFilesToNearbyDevices } from './examples/serviceUsage';

export function MyFileShareComponent() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    // Load devices on mount
    getAvailableDevices().then(setDevices);
  }, []);

  const handleFileShare = async (files: File[]) => {
    setIsTransferring(true);
    try {
      const success = await sendFilesToNearbyDevices(files);
      if (success) {
        alert('Files sent successfully!');
      } else {
        alert('Failed to send files');
      }
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div>
      <h2>Available Devices: {devices.length}</h2>
      {devices.map(device => (
        <div key={device.id}>{device.name} ({device.platform})</div>
      ))}
      {isTransferring && <p>Transferring files...</p>}
    </div>
  );
}
*/
