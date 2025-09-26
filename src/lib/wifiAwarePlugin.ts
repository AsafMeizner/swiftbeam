// src/lib/wifiAwarePlugin.ts
import { WifiAware } from '@asaf/wifi-aware';

// Extend the WifiAware plugin with the new sendFileTransfer method
declare module '@asaf/wifi-aware' {
  interface WifiAwarePlugin {
    // Add the missing sendFileTransfer method
    sendFileTransfer(options: {
      peerId: string;
      filePath?: string;
      fileBase64?: string;
      fileName: string;
      mimeType?: string;
      multicast?: boolean;
      peerIds?: string[];
    }): Promise<{ transferId: string }>;
    
    // Add the missing cancelFileTransfer method
    cancelFileTransfer(transferId: string): Promise<void>;
  }
}

export default WifiAware;