# Device Discovery and File Transfer Services

This document describes the refactored device discovery and file transfer functionality that has been separated into dedicated services for better maintainability and easier future implementation of actual networking logic.

## Overview

The functionality has been split into two main services:

1. **`DeviceDiscoveryService`** - Handles finding and managing nearby devices
2. **`FileTransferService`** - Handles sending files to multiple devices with progress tracking

## Services

### Device Discovery Service (`src/services/deviceDiscovery.ts`)

Manages device discovery and provides information about nearby devices.

#### Key Features:
- Get all discovered devices (with sorting)
- Filter active/online devices only
- Scan for new devices
- Filter devices by search term
- Device statistics and monitoring
- Scan status callbacks

#### Main Functions:
```typescript
// Get instance (singleton pattern)
const deviceService = getDeviceDiscoveryService();

// Quick access functions
const activeDevices = await getActiveDevices();
const allDevices = await getAllDevices("-last_seen");
const scanResults = await startDeviceScan(2000); // 2 second scan
```

#### Example Usage:
```typescript
import { getActiveDevices, startDeviceScan } from '@/services/deviceDiscovery';

// Get currently online devices
const onlineDevices = await getActiveDevices();

// Scan for new devices
const foundDevices = await startDeviceScan(3000);

// Monitor scan status
const service = getDeviceDiscoveryService();
service.onScanStatusChange(() => {
  console.log('Scan status changed:', service.isCurrentlyScanning());
});
```

### File Transfer Service (`src/services/fileTransfer.ts`)

Handles file transfers to multiple devices with progress tracking and status management.

#### Key Features:
- Send files to multiple devices simultaneously
- Real-time progress tracking
- Transfer status management (pending, transferring, completed, failed, cancelled)
- Transfer cancellation
- Batch processing with configurable concurrency
- Speed and ETA estimation

#### Main Functions:
```typescript
// Get instance
const transferService = getFileTransferService();

// Quick access functions
const result = await sendFilesToDevices(files, devices, options);
const activeTransfers = getActiveTransfers();
const hasActive = hasActiveTransfers();
await cancelFileTransfer(fileId);
```

#### Example Usage:
```typescript
import { sendFilesToDevices } from '@/services/fileTransfer';

const result = await sendFilesToDevices(files, devices, {
  onProgress: (progress) => {
    console.log(`${progress.fileName}: ${progress.progress}% (${progress.status})`);
  },
  simultaneousTransfers: 2, // Process 2 files at once
  timeout: 30000 // 30 second timeout
});

if (result.success) {
  console.log('All transfers completed!');
} else {
  console.error('Some transfers failed:', result.errors);
}
```

## Updated Components

### DeviceSelector Component (`src/components/share/DeviceSelector.tsx`)

Updated to use the new `DeviceDiscoveryService`:
- Automatic scan status synchronization
- Improved device loading and scanning
- Better separation of concerns

### Share Page (`src/app/share/page.tsx`)

Updated to use the new `FileTransferService`:
- Enhanced progress tracking
- Better error handling
- Cleaner transfer logic
- Real-time status updates

### Discovery Page (`src/app/discovery/page.tsx`)

Updated to use the new `DeviceDiscoveryService`:
- Improved device scanning
- Better state management
- Enhanced filtering capabilities

## Types and Interfaces

### Transfer Progress
```typescript
interface TransferProgress {
  fileId: string;
  fileName: string;
  status: "pending" | "transferring" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  error?: string;
}
```

### Transfer Result
```typescript
interface TransferResult {
  success: boolean;
  transfers: FileTransferData[];
  errors: string[];
}
```

## Migration Benefits

1. **Separation of Concerns**: Device discovery and file transfer logic are now separate
2. **Easier Testing**: Services can be tested independently
3. **Better Maintainability**: Changes to transfer logic don't affect discovery logic
4. **Future-Proof**: Easy to replace mock implementations with real networking code
5. **Enhanced Features**: Better progress tracking, error handling, and status management
6. **Reusability**: Services can be used across different components

## Future Implementation

Currently, both services use mock/demo data and simulated transfers. To implement real functionality:

### Device Discovery
Replace the mock device list and simulation in `DeviceDiscoveryService` with:
- Actual network device discovery (Bonjour/mDNS, WiFi Direct, Bluetooth)
- Real device status monitoring
- Network interface scanning

### File Transfer
Replace the mock transfer logic in `FileTransferService` with:
- Real file upload/transfer protocols (WebRTC, HTTP, custom protocol)
- Actual progress monitoring from network operations
- Real transfer speed and ETA calculations
- Network error handling and retry logic

## Example Implementation

See `src/examples/serviceUsage.ts` for comprehensive examples of how to use both services in various scenarios.

## Key Files

- `src/services/deviceDiscovery.ts` - Device discovery service
- `src/services/fileTransfer.ts` - File transfer service
- `src/examples/serviceUsage.ts` - Usage examples
- `src/components/share/DeviceSelector.tsx` - Updated device selector
- `src/app/share/page.tsx` - Updated share page
- `src/app/discovery/page.tsx` - Updated discovery page
