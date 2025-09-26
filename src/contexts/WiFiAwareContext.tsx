"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  getWiFiAwareBroadcastService,
  IncomingFileRequest, 
  FileRequestResponse,
  BroadcastSettings
} from "@/services/wifiAwareBroadcast";
import { NativeFileTransferProgress, FileTransferResult } from "@/types";
import IncomingFileRequestModal from "@/components/modals/IncomingFileRequestModal";

interface WiFiAwareContextType {
  // Broadcast state
  isBroadcasting: boolean;
  settings: BroadcastSettings;
  
  // Requests state
  pendingRequests: IncomingFileRequest[];
  currentRequest: IncomingFileRequest | null;
  
  // Transfers state
  activeTransfers: NativeFileTransferProgress[];
  
  // Actions
  startBroadcasting: () => Promise<boolean>;
  stopBroadcasting: () => Promise<boolean>;
  updateSettings: (settings: Partial<BroadcastSettings>) => Promise<void>;
  respondToRequest: (requestId: string, response: FileRequestResponse) => Promise<boolean>;
  dismissCurrentRequest: () => void;
  showRequest: (request: IncomingFileRequest) => void;
  clearAllRequests: () => void;
  cancelTransfer: (transferId: string) => Promise<boolean>;
}

const WiFiAwareContext = createContext<WiFiAwareContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export function WiFiAwareProvider({ children }: Props) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [settings, setSettings] = useState<BroadcastSettings>({
    enabled: false,
    deviceName: "My Device",
    visibility: "everyone",
    autoAcceptFromTrustedDevices: false,
    allowPreview: true,
    maxFileSize: 100 * 1024 * 1024
  });
  const [pendingRequests, setPendingRequests] = useState<IncomingFileRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<IncomingFileRequest | null>(null);
  const [activeTransfers, setActiveTransfers] = useState<NativeFileTransferProgress[]>([]);
  const [showModal, setShowModal] = useState(false);

  const broadcastService = getWiFiAwareBroadcastService();

  useEffect(() => {
    // Initialize state from service
    const initializeState = async () => {
      // Get current settings first
      const currentSettings = broadcastService.getSettings();
      setSettings(currentSettings);
      
      // Ensure broadcasting state matches the settings
      if (currentSettings.enabled && !broadcastService.isBroadcasting()) {
        await broadcastService.startBroadcasting();
      }
      
      setIsBroadcasting(broadcastService.isBroadcasting());
      setPendingRequests(broadcastService.getPendingRequests());
      setActiveTransfers(broadcastService.getAllTransfers());
    };
    
    initializeState();

    // Set up event listeners
    const handleBroadcastStatusChange = () => {
      setIsBroadcasting(broadcastService.isBroadcasting());
    };

    const handleIncomingRequest = (request: IncomingFileRequest) => {
      setPendingRequests(prev => {
        // Avoid duplicates
        if (prev.some(r => r.id === request.id)) {
          return prev;
        }
        return [...prev, request];
      });

      // Show modal for the new request
      setCurrentRequest(request);
      setShowModal(true);

      // Play notification sound (in real app)
      console.log("🔔 New file request received!");
    };

    const handleRequestResponse = (requestId: string, response: FileRequestResponse) => {
      // Remove request from pending list if not pending
      if (response !== "pending") {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        
        // Close modal if this was the current request
        if (currentRequest?.id === requestId) {
          setShowModal(false);
          setCurrentRequest(null);
        }
      }
    };
    
    const handleTransferProgress = (progress: NativeFileTransferProgress) => {
      // Update the active transfers list
      setActiveTransfers(prev => {
        const existing = prev.findIndex(t => t.transferId === progress.transferId);
        if (existing >= 0) {
          // Replace existing progress data
          const newList = [...prev];
          newList[existing] = progress;
          return newList;
        } else {
          // Add new transfer
          return [...prev, progress];
        }
      });
    };
    
    const handleTransferCompleted = (result: FileTransferResult) => {
      // Remove from active transfers
      setActiveTransfers(prev => prev.filter(t => t.transferId !== result.transferId));
      
      // Add to history
      try {
        // Add to FileTransfer history
        import("@/entities/FileTransfer").then(({ FileTransfer }) => {
          FileTransfer.create({
            filename: result.fileName,
            file_size: 0, // We don't have this info in the completion event
            file_type: "application/octet-stream", 
            sender_device: "Remote Device",
            recipient_device: "My Device",
            transfer_status: "completed",
            file_url: result.filePath
          });
        });
      } catch (error) {
        console.error("Failed to add transfer to history:", error);
      }
    };

    // Register callbacks
    broadcastService.onBroadcastStatusChange(handleBroadcastStatusChange);
    broadcastService.onIncomingRequest(handleIncomingRequest);
    broadcastService.onRequestResponse(handleRequestResponse);
    broadcastService.onTransferProgress(handleTransferProgress);
    broadcastService.onTransferCompleted(handleTransferCompleted);

    // Cleanup
    return () => {
      broadcastService.removeCallback(handleBroadcastStatusChange);
      broadcastService.removeIncomingRequestCallback(handleIncomingRequest);
      broadcastService.removeRequestResponseCallback(handleRequestResponse);
      broadcastService.removeTransferProgressCallback(handleTransferProgress);
      broadcastService.removeTransferCompletedCallback(handleTransferCompleted);
    };
  }, [broadcastService, currentRequest]);

  const startBroadcastingAction = async (): Promise<boolean> => {
    const success = await broadcastService.startBroadcasting();
    if (success) {
      setIsBroadcasting(true);
    }
    return success;
  };

  const stopBroadcastingAction = async (): Promise<boolean> => {
    const success = await broadcastService.stopBroadcasting();
    if (success) {
      setIsBroadcasting(false);
    }
    return success;
  };

  const updateSettingsAction = async (newSettings: Partial<BroadcastSettings>): Promise<void> => {
    await broadcastService.updateSettings(newSettings);
    setSettings(broadcastService.getSettings());
  };

  const respondToRequestAction = async (
    requestId: string, 
    response: FileRequestResponse
  ): Promise<boolean> => {
    const success = await broadcastService.respondToRequest(requestId, response);
    
    // If accepted, add to history
    if (success && response === "accept") {
      const request = pendingRequests.find(r => r.id === requestId) || currentRequest;
      if (request) {
        try {
          // Add to FileTransfer history
          const { FileTransfer } = await import("@/entities/FileTransfer");
          await FileTransfer.create({
            filename: request.files.map(f => f.name).join(", "),
            file_size: request.files.reduce((sum, f) => sum + f.size, 0),
            file_type: request.files[0]?.type || "application/octet-stream",
            sender_device: request.senderDevice.name,
            recipient_device: "My Device",
            transfer_status: "completed"
          });
        } catch (error) {
          console.error("Failed to add transfer to history:", error);
        }
      }
    }
    
    if (success && response !== "pending") {
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Close modal and show next request if any
      if (currentRequest?.id === requestId) {
        setShowModal(false);
        setCurrentRequest(null);
        
        // Show next pending request after a brief delay
        setTimeout(() => {
          const remainingRequests = pendingRequests.filter(r => r.id !== requestId);
          if (remainingRequests.length > 0) {
            setCurrentRequest(remainingRequests[0]);
            setShowModal(true);
          }
        }, 300);
      }
    }
    
    return success;
  };

  const dismissCurrentRequest = () => {
    setShowModal(false);
    setCurrentRequest(null);
  };

  const showRequest = (request: IncomingFileRequest) => {
    setCurrentRequest(request);
    setShowModal(true);
  };

  const clearAllRequests = () => {
    broadcastService.clearPendingRequests();
    setPendingRequests([]);
    setShowModal(false);
    setCurrentRequest(null);
  };
  
  const cancelTransferAction = async (transferId: string): Promise<boolean> => {
    const result = await broadcastService.cancelFileTransfer(transferId);
    if (result) {
      // Remove from active transfers immediately for responsive UI
      setActiveTransfers(prev => prev.filter(t => t.transferId !== transferId));
    }
    return result;
  };

  const contextValue: WiFiAwareContextType = {
    isBroadcasting,
    settings,
    pendingRequests,
    currentRequest,
    activeTransfers,
    startBroadcasting: startBroadcastingAction,
    stopBroadcasting: stopBroadcastingAction,
    updateSettings: updateSettingsAction,
    respondToRequest: respondToRequestAction,
    dismissCurrentRequest,
    showRequest,
    clearAllRequests,
    cancelTransfer: cancelTransferAction
  };

  return (
    <WiFiAwareContext.Provider value={contextValue}>
      {children}
      
      {/* Global incoming file request modal */}
      <IncomingFileRequestModal
        request={currentRequest}
        isOpen={showModal}
        onResponse={async (response) => {
          if (currentRequest) {
            await respondToRequestAction(currentRequest.id, response);
          }
        }}
        onClose={dismissCurrentRequest}
      />
    </WiFiAwareContext.Provider>
  );
}

export function useWiFiAware(): WiFiAwareContextType {
  const context = useContext(WiFiAwareContext);
  if (context === undefined) {
    throw new Error("useWiFiAware must be used within a WiFiAwareProvider");
  }
  return context;
}

// Hook for broadcasting status only
export function useBroadcastStatus() {
  const { isBroadcasting, startBroadcasting, stopBroadcasting } = useWiFiAware();
  return { isBroadcasting, startBroadcasting, stopBroadcasting };
}

// Hook for incoming requests only
export function useIncomingRequests() {
  const { pendingRequests, currentRequest, respondToRequest, showRequest, clearAllRequests } = useWiFiAware();
  return { pendingRequests, currentRequest, respondToRequest, showRequest, clearAllRequests };
}

// Hook for file transfers
export function useFileTransfers() {
  const { activeTransfers, cancelTransfer } = useWiFiAware();
  return { activeTransfers, cancelTransfer };
}

// Hook for settings only
export function useBroadcastSettings() {
  const { settings, updateSettings } = useWiFiAware();
  return { settings, updateSettings };
}
