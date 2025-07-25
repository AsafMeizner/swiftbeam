"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  getWiFiAwareBroadcastService, 
  IncomingFileRequest, 
  FileRequestResponse,
  BroadcastSettings
} from "@/services/wifiAwareBroadcast";
import IncomingFileRequestModal from "@/components/modals/IncomingFileRequestModal";

interface WiFiAwareContextType {
  // Broadcast state
  isBroadcasting: boolean;
  settings: BroadcastSettings;
  
  // Requests state
  pendingRequests: IncomingFileRequest[];
  currentRequest: IncomingFileRequest | null;
  
  // Actions
  startBroadcasting: () => Promise<boolean>;
  stopBroadcasting: () => Promise<boolean>;
  updateSettings: (settings: Partial<BroadcastSettings>) => Promise<void>;
  respondToRequest: (requestId: string, response: FileRequestResponse, saveLocation?: string) => Promise<boolean>;
  dismissCurrentRequest: () => void;
  showRequest: (request: IncomingFileRequest) => void;
  clearAllRequests: () => void;
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
  const [showModal, setShowModal] = useState(false);

  const broadcastService = getWiFiAwareBroadcastService();

  useEffect(() => {
    // Initialize state from service
    setIsBroadcasting(broadcastService.isBroadcasting());
    setSettings(broadcastService.getSettings());
    setPendingRequests(broadcastService.getPendingRequests());

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

    // Register callbacks
    broadcastService.onBroadcastStatusChange(handleBroadcastStatusChange);
    broadcastService.onIncomingRequest(handleIncomingRequest);
    broadcastService.onRequestResponse(handleRequestResponse);

    // Cleanup
    return () => {
      broadcastService.removeCallback(handleBroadcastStatusChange);
      broadcastService.removeCallback(handleIncomingRequest);
      broadcastService.removeCallback(handleRequestResponse);
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
    response: FileRequestResponse, 
    saveLocation?: string
  ): Promise<boolean> => {
    const success = await broadcastService.respondToRequest(requestId, response, saveLocation);
    
    if (success && response !== "pending") {
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Close modal if this was the current request
      if (currentRequest?.id === requestId) {
        setShowModal(false);
        setCurrentRequest(null);
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

  const contextValue: WiFiAwareContextType = {
    isBroadcasting,
    settings,
    pendingRequests,
    currentRequest,
    startBroadcasting: startBroadcastingAction,
    stopBroadcasting: stopBroadcastingAction,
    updateSettings: updateSettingsAction,
    respondToRequest: respondToRequestAction,
    dismissCurrentRequest,
    showRequest,
    clearAllRequests
  };

  return (
    <WiFiAwareContext.Provider value={contextValue}>
      {children}
      
      {/* Global incoming file request modal */}
      <IncomingFileRequestModal
        request={currentRequest}
        isOpen={showModal}
        onResponse={async (response, saveLocation) => {
          if (currentRequest) {
            await respondToRequestAction(currentRequest.id, response, saveLocation);
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

// Hook for settings only
export function useBroadcastSettings() {
  const { settings, updateSettings } = useWiFiAware();
  return { settings, updateSettings };
}
