/**
 * The TypeScript code provides development utilities and console commands for testing WiFi Aware
 * functionality, including simulating incoming files, testing broadcasting, and creating custom file
 * requests.
 * @returns The code snippet is returning an object `swiftbeamDev` that contains various functions and
 * data for simulating file transfers and testing WiFi Aware functionality. This object is attached to
 * the `window` object in a development environment, allowing developers to access and call these
 * functions directly from the browser console.
 */
// /**
//  * Development utilities and console commands for testing WiFi Aware functionality
//  * 
//  * To use these commands, open the browser console and call the functions directly:
//  * - window.swiftbeamDev.simulateIncomingFile()
//  * - window.swiftbeamDev.simulateMultipleFiles()
//  * - window.swiftbeamDev.testBroadcasting()
//  */

// import { simulateIncomingFileRequest } from "@/services/wifiAwareBroadcast";
// import { DeviceData, FileData } from "@/types";

// // Mock device data for testing
// const mockSenderDevices: DeviceData[] = [
//   {
//     id: "test-device-1",
//     name: "Alice's iPhone",
//     type: "phone",
//     platform: "ios",
//     is_online: true,
//     last_seen: new Date().toISOString(),
//     connection_status: "available",
//     created_date: new Date().toISOString()
//   },
//   {
//     id: "test-device-2", 
//     name: "Bob's Laptop",
//     type: "laptop",
//     platform: "windows",
//     is_online: true,
//     last_seen: new Date().toISOString(),
//     connection_status: "available",
//     created_date: new Date().toISOString()
//   },
//   {
//     id: "test-device-3",
//     name: "Carol's Android",
//     type: "phone", 
//     platform: "android",
//     is_online: true,
//     last_seen: new Date().toISOString(),
//     connection_status: "available",
//     created_date: new Date().toISOString()
//   }
// ];

// // Mock file data for testing
// const mockFiles: FileData[] = [
//   {
//     id: "file-1",
//     name: "vacation-photo.jpg",
//     size: 2.5 * 1024 * 1024, // 2.5 MB
//     type: "image/jpeg",
//     lastModified: Date.now(),
//     status: "ready"
//   },
//   {
//     id: "file-2",
//     name: "presentation.pdf",
//     size: 1.2 * 1024 * 1024, // 1.2 MB
//     type: "application/pdf", 
//     lastModified: Date.now(),
//     status: "ready"
//   },
//   {
//     id: "file-3",
//     name: "demo-video.mp4",
//     size: 15 * 1024 * 1024, // 15 MB
//     type: "video/mp4",
//     lastModified: Date.now(),
//     status: "ready"
//   },
//   {
//     id: "file-4",
//     name: "song.mp3",
//     size: 4 * 1024 * 1024, // 4 MB
//     type: "audio/mpeg",
//     lastModified: Date.now(),
//     status: "ready"
//   },
//   {
//     id: "file-5",
//     name: "project-files.zip",
//     size: 25 * 1024 * 1024, // 25 MB
//     type: "application/zip",
//     lastModified: Date.now(),
//     status: "ready"
//   }
// ];

// const messages = [
//   "Hey, sharing some photos from the trip!",
//   "Here's the document you requested",
//   "Check out this cool video I found",
//   "Can you review this presentation?",
//   "",
//   "Thanks for your help earlier ❤️",
//   "Quick file share"
// ];

// /**
//  * Simulate receiving a single file from a random device
//  */
// function simulateIncomingFile(): string {
//   const randomDevice = mockSenderDevices[Math.floor(Math.random() * mockSenderDevices.length)];
//   const randomFile = mockFiles[Math.floor(Math.random() * mockFiles.length)];
//   const randomMessage = messages[Math.floor(Math.random() * messages.length)];

//   console.log(`🔄 Simulating incoming file from ${randomDevice.name}...`);
  
//   const requestId = simulateIncomingFileRequest(
//     randomDevice,
//     [randomFile],
//     randomMessage || undefined
//   );

//   console.log(`✅ Simulated file request created with ID: ${requestId}`);
//   console.log(`📱 From: ${randomDevice.name} (${randomDevice.platform})`);
//   console.log(`📄 File: ${randomFile.name} (${(randomFile.size / 1024 / 1024).toFixed(1)} MB)`);
//   if (randomMessage) {
//     console.log(`💬 Message: "${randomMessage}"`);
//   }

//   return requestId;
// }

// /**
//  * Simulate receiving multiple files from a device
//  */
// function simulateMultipleFiles(fileCount: number = 3): string {
//   const randomDevice = mockSenderDevices[Math.floor(Math.random() * mockSenderDevices.length)];
//   const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
//   // Select random files
//   const shuffledFiles = [...mockFiles].sort(() => Math.random() - 0.5);
//   const selectedFiles = shuffledFiles.slice(0, Math.min(fileCount, mockFiles.length));

//   console.log(`🔄 Simulating ${fileCount} files from ${randomDevice.name}...`);
  
//   const requestId = simulateIncomingFileRequest(
//     randomDevice,
//     selectedFiles,
//     randomMessage || undefined
//   );

//   console.log(`✅ Simulated multi-file request created with ID: ${requestId}`);
//   console.log(`📱 From: ${randomDevice.name} (${randomDevice.platform})`);
//   console.log(`📄 Files (${selectedFiles.length}):`);
//   selectedFiles.forEach(file => {
//     console.log(`   - ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
//   });
//   if (randomMessage) {
//     console.log(`💬 Message: "${randomMessage}"`);
//   }

//   return requestId;
// }

// /**
//  * Simulate a large file transfer request
//  */
// function simulateLargeFile(): string {
//   const randomDevice = mockSenderDevices[Math.floor(Math.random() * mockSenderDevices.length)];
  
//   const largeFile: FileData = {
//     id: "large-file-test",
//     name: "4K-movie.mkv", 
//     size: 1.5 * 1024 * 1024 * 1024, // 1.5 GB
//     type: "video/x-matroska",
//     lastModified: Date.now(),
//     status: "ready"
//   };

//   console.log(`🔄 Simulating large file from ${randomDevice.name}...`);
  
//   const requestId = simulateIncomingFileRequest(
//     randomDevice,
//     [largeFile],
//     "This is a large file, it might take a while to transfer"
//   );

//   console.log(`✅ Simulated large file request created with ID: ${requestId}`);
//   console.log(`📱 From: ${randomDevice.name}`);
//   console.log(`📄 File: ${largeFile.name} (${(largeFile.size / 1024 / 1024 / 1024).toFixed(1)} GB)`);
//   console.log(`⚠️  Large file warning will be shown to user`);

//   return requestId;
// }

// /**
//  * Test broadcasting functionality
//  */
// async function testBroadcasting(): Promise<void> {
//   console.log("🔄 Testing broadcasting functionality...");
  
//   try {
//     const { getWiFiAwareBroadcastService } = await import("@/services/wifiAwareBroadcast");
//     const service = getWiFiAwareBroadcastService();
    
//     console.log(`📡 Current broadcast status: ${service.isBroadcasting() ? "Active" : "Inactive"}`);
//     console.log(`⚙️  Settings:`, service.getSettings());
//     console.log(`👁️  Visibility: ${service.getVisibilityStatus()}`);
//     console.log(`📥 Can receive files: ${service.canReceiveFiles()}`);
//     console.log(`📋 Pending requests: ${service.getPendingRequests().length}`);
    
//     if (!service.isBroadcasting()) {
//       console.log("💡 Tip: Enable WiFi Aware in Settings to start broadcasting");
//     }
//   } catch (error) {
//     console.error("❌ Error testing broadcasting:", error);
//   }
// }

// /**
//  * Simulate a burst of incoming requests (stress test)
//  */
// function simulateBurst(count: number = 5): string[] {
//   console.log(`🔄 Simulating burst of ${count} file requests...`);
  
//   const requestIds: string[] = [];
  
//   for (let i = 0; i < count; i++) {
//     setTimeout(() => {
//       const requestId = simulateIncomingFile();
//       requestIds.push(requestId);
//       console.log(`📨 Request ${i + 1}/${count} sent (ID: ${requestId})`);
//     }, i * 1000); // 1 second between each request
//   }
  
//   console.log(`✅ Scheduled ${count} requests to be sent over ${count} seconds`);
//   return requestIds;
// }

// /**
//  * Create a mock file request with custom parameters
//  */
// function createCustomRequest(
//   deviceName: string = "Custom Device",
//   fileName: string = "custom-file.txt",
//   fileSizeMB: number = 1,
//   message?: string
// ): string {
//   const customDevice: DeviceData = {
//     id: "custom-device",
//     name: deviceName,
//     type: "unknown",
//     platform: "web",
//     is_online: true,
//     last_seen: new Date().toISOString(),
//     connection_status: "available", 
//     created_date: new Date().toISOString()
//   };

//   const customFile: FileData = {
//     id: "custom-file",
//     name: fileName,
//     size: fileSizeMB * 1024 * 1024,
//     type: "text/plain",
//     lastModified: Date.now(),
//     status: "ready"
//   };

//   console.log(`🔄 Creating custom file request...`);
  
//   const requestId = simulateIncomingFileRequest(
//     customDevice,
//     [customFile],
//     message
//   );

//   console.log(`✅ Custom request created with ID: ${requestId}`);
//   return requestId;
// }

// /**
//  * Get help for available dev commands
//  */
// function help(): void {
//   console.log(`
// 🛠️  SwiftBeam Development Console Commands:

// 📥 File Request Simulation:
//    simulateIncomingFile()                    - Single random file
//    simulateMultipleFiles(count?)             - Multiple files (default: 3)
//    simulateLargeFile()                       - Large file (1.5GB) 
//    simulateBurst(count?)                     - Multiple requests over time
//    createCustomRequest(device, file, size, msg) - Custom request

// 📡 Broadcasting:
//    testBroadcasting()                        - Test broadcast functionality

// 💡 Usage Examples:
//    swiftbeamDev.simulateIncomingFile()
//    swiftbeamDev.simulateMultipleFiles(5)
//    swiftbeamDev.createCustomRequest("John's MacBook", "report.pdf", 2.5, "Here's the report!")
//    swiftbeamDev.help()

// Note: Make sure WiFi Aware is enabled in Settings to see the incoming file modal!
//   `);
// }

// // Create the dev object to attach to window
// const swiftbeamDev = {
//   simulateIncomingFile,
//   simulateMultipleFiles,
//   simulateLargeFile,
//   testBroadcasting,
//   simulateBurst,
//   createCustomRequest,
//   help,
  
//   // Direct access to mock data for custom scenarios
//   mockDevices: mockSenderDevices,
//   mockFiles: mockFiles,
//   messages: messages
// };

// // Attach to window in development
// if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
//   (window as typeof window & { swiftbeamDev: typeof swiftbeamDev }).swiftbeamDev = swiftbeamDev;
//   console.log("🛠️  SwiftBeam Dev Tools loaded! Type 'swiftbeamDev.help()' for available commands.");
// }

// export default swiftbeamDev;
