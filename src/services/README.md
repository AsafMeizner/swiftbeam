# Device Discovery and File Transfer Services

This document describes the refactored device discovery and file transfer functionality that has been separated into dedicated services for better maintainability and easier future implementation of actual networking logic.

## Overview

The functionality has been split into three main services:

1. **`DeviceDiscoveryService`** - Handles finding and managing nearby devices
2. **`FileTransferService`** - Handles sending files to multiple devices with progress tracking
3. **`WiFiAwareBroadcastService`** - Handles WiFi Aware broadcasting and incoming file requests

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

### WiFi Aware Broadcast Service (`src/services/wifiAwareBroadcast.ts`)

Handles WiFi Aware broadcasting for cross-platform device discovery and incoming file request management.

#### Key Features:
- Cross-platform WiFi Aware broadcasting (iOS, Android, Windows, macOS)
- Device availability broadcasting with configurable visibility
- Incoming file request handling with accept/decline functionality
- File preview support for images
- Auto-accept from trusted devices
- File size limitations and security settings

#### Main Functions:
```typescript
// Get instance
const broadcastService = getWiFiAwareBroadcastService();

// Broadcasting control
await startBroadcasting();
await stopBroadcasting();
const isActive = isBroadcasting();

// Settings management
await broadcastService.updateSettings({
  enabled: true,
  visibility: "everyone",
  deviceName: "My Device"
});

// Handle incoming requests
broadcastService.onIncomingRequest((request) => {
  // Show modal to user
});

await respondToFileRequest(requestId, "accept", "/Downloads");
```

#### Example Usage:
```typescript
import { getWiFiAwareBroadcastService } from '@/services/wifiAwareBroadcast';

const service = getWiFiAwareBroadcastService();

// Enable file sharing
await service.updateSettings({
  enabled: true,
  visibility: "everyone",
  deviceName: "John's MacBook"
});

await service.startBroadcasting();

// Handle incoming requests
service.onIncomingRequest((request) => {
  console.log(`File request from ${request.senderDevice.name}`);
  console.log(`Files: ${request.files.map(f => f.name).join(', ')}`);
});
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

### Settings Page (`src/app/settings/page.tsx`)

Added WiFi Aware settings section:
- Enable/disable file sharing broadcasting
- Configure device visibility (everyone, contacts, hidden)
- Set device name and file size limits
- Auto-accept settings for trusted devices
- Real-time broadcast status indicators

### App Layout (`src/app/layout.tsx`)

Integrated WiFi Aware provider:
- Global WiFi Aware context for all components
- Automatic incoming file request modal handling
- Development tools loader for testing

### App Sidebar (`src/components/AppSidebar.tsx`)

Enhanced with WiFi Aware status:
- Shows broadcasting status (online/offline)
- Displays pending file request count
- Visual indicators for incoming requests

## New Components

### IncomingFileRequestModal (`src/components/modals/IncomingFileRequestModal.tsx`)

Modal for handling incoming file requests:
- Displays sender device information
- Shows file list with previews and sizes
- Save location selection
- Accept/decline buttons with progress indication
- Large file warnings and transfer time estimates

### WiFiAwareContext (`src/contexts/WiFiAwareContext.tsx`)

Global context provider for WiFi Aware functionality:
- Manages broadcast state and settings
- Handles incoming file requests
- Provides hooks for components to access WiFi Aware features
- Automatic modal management for file requests

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

### Incoming File Request
```typescript
interface IncomingFileRequest {
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
  message?: string;
  estimatedTransferTime: number; // in seconds
}
```

### Broadcast Settings
```typescript
interface BroadcastSettings {
  enabled: boolean;
  deviceName: string;
  visibility: "everyone" | "contacts" | "off";
  autoAcceptFromTrustedDevices: boolean;
  allowPreview: boolean;
  maxFileSize: number; // in bytes
}
```

## Development Tools

### Console Commands (`src/utils/devConsole.ts`)

Development console commands for testing WiFi Aware functionality:

```javascript
// Open browser console and use these commands:

// Simulate incoming file requests
swiftbeamDev.simulateIncomingFile()                    // Single random file
swiftbeamDev.simulateMultipleFiles(3)                  // Multiple files
swiftbeamDev.simulateLargeFile()                       // Large file (1.5GB)
swiftbeamDev.simulateBurst(5)                          // Multiple requests over time

// Custom requests
swiftbeamDev.createCustomRequest("John's iPhone", "report.pdf", 2.5, "Here's the report!")

// Test broadcasting
swiftbeamDev.testBroadcasting()                        // Check broadcast status

// Get help
swiftbeamDev.help()                                    // Show all commands
```

**Note:** Make sure WiFi Aware is enabled in Settings to see the incoming file modal!

## Migration Benefits

1. **Separation of Concerns**: Device discovery, file transfer, and broadcasting logic are now separate
2. **Easier Testing**: Services can be tested independently
3. **Better Maintainability**: Changes to one service don't affect others
4. **Future-Proof**: Easy to replace mock implementations with real networking code
5. **Enhanced Features**: Better progress tracking, error handling, and status management
6. **Reusability**: Services can be used across different components
7. **Cross-Platform Ready**: WiFi Aware service prepared for iOS, Android, Windows, macOS
8. **User Experience**: Seamless incoming file request handling with modal interface

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

### WiFi Aware Broadcasting
Replace the mock broadcasting logic in `WiFiAwareBroadcastService` with:
- Real WiFi Aware session management (iOS NearbyInteraction, Android Aware, Windows WiFi Direct)
- Actual device discovery and publishing
- Cross-platform protocol handling
- Real file reception and transfer coordination

## Example Implementation

See `src/examples/serviceUsage.ts` for comprehensive examples of how to use both services in various scenarios.

## Key Files

- `src/services/deviceDiscovery.ts` - Device discovery service
- `src/services/fileTransfer.ts` - File transfer service
- `src/services/wifiAwareBroadcast.ts` - WiFi Aware broadcasting service
- `src/contexts/WiFiAwareContext.tsx` - Global WiFi Aware context provider
- `src/components/modals/IncomingFileRequestModal.tsx` - Incoming file request modal
- `src/utils/devConsole.ts` - Development testing commands
- `src/examples/serviceUsage.ts` - Usage examples
- `src/components/share/DeviceSelector.tsx` - Updated device selector
- `src/app/share/page.tsx` - Updated share page
- `src/app/discovery/page.tsx` - Updated discovery page
- `src/app/settings/page.tsx` - Updated settings with WiFi Aware controls
