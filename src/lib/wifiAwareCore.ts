'use client';

import { Capacitor } from '@capacitor/core';
// Import our extended plugin definition
import WifiAware from './wifiAwarePlugin';
import { 
    type AttachResult, 
    type DeviceInfo, 
    type SocketResult, 
    type FileTransferProgress
} from '@asaf/wifi-aware';

const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64FromJson = (obj: any) =>
    btoa(String.fromCharCode(...enc.encode(JSON.stringify(obj))));

export const jsonFromB64 = <T = any>(b64: string): T => {
    const bin = atob(b64);
    const arr = Uint8Array.from(bin, c => c.charCodeAt(0));
    return JSON.parse(dec.decode(arr));
};

// Map the events to listener signatures so we can be type-safe
type ServiceFoundEvt = { 
    peerId: string; 
    serviceName: string; 
    distanceMm?: number; 
    serviceInfoBase64?: string;
    deviceInfo?: DeviceInfo;
};
type ServiceLostEvt = { peerId: string; serviceName: string };
type MessageEvt = { peerId: string; dataBase64: string };
type SocketReadyEvt = SocketResult;
type SocketClosedEvt = { socketId?: string };
type PeerConnectedEvt = { socketId: string; peerId: string; deviceInfo?: DeviceInfo };
type PeerDisconnectedEvt = { socketId: string; peerId: string };
type FileTransferRequestEvt = { 
    peerId: string; 
    transferId: string; 
    fileName: string; 
    mimeType?: string; 
    fileSize: number 
};
type FileTransferCompletedEvt = { 
    peerId: string; 
    transferId: string; 
    fileName: string; 
    filePath?: string; 
    fileBase64?: string 
};

type EventMap = {
    stateChanged: (s: AttachResult) => void;
    serviceFound: (ev: ServiceFoundEvt) => void;
    serviceLost: (ev: ServiceLostEvt) => void;
    messageReceived: (msg: MessageEvt) => void;
    socketReady: (res: SocketReadyEvt) => void;
    socketClosed: (data: SocketClosedEvt) => void;
    peerConnected: (data: PeerConnectedEvt) => void;
    peerDisconnected: (data: PeerDisconnectedEvt) => void;
    fileTransferRequest: (req: FileTransferRequestEvt) => void;
    fileTransferProgress: (progress: FileTransferProgress) => void;
    fileTransferCompleted: (result: FileTransferCompletedEvt) => void;
};

export const WifiAwareCore = {
    SERVICE_NAME: 'swiftbeam',

    isNative() { return Capacitor.isNativePlatform(); },

    async ensureAttached(): Promise<AttachResult> {
        if (!this.isNative()) return { available: false, reason: 'Not a native platform' };
        try {
            const res = await WifiAware.attach();
            return res || { available: false, reason: 'Unknown error' };
        } catch (error) { 
            return { available: false, reason: error?.toString() || 'Unknown error' }; 
        }
    },

    async getDeviceInfo(peerId: string) {
        return WifiAware.getDeviceInfo({ peerId });
    },

    publish(devicePayload: any) {
        return WifiAware.publish({
            serviceName: this.SERVICE_NAME,
            serviceInfoBase64: b64FromJson(devicePayload),
            instantMode: true,
            rangingEnabled: true,
            deviceInfo: true,
            multicastEnabled: true
        });
    },

    subscribe() {
        return WifiAware.subscribe({
            serviceName: this.SERVICE_NAME,
            instantMode: true,
            minDistanceMm: 0,
            maxDistanceMm: 20000,
            requestDeviceInfo: true
        });
    },

    async stopAll() {
        try { await WifiAware.stopPublish(); } catch { }
        try { await WifiAware.stopSubscribe(); } catch { }
        try { await WifiAware.stopSocket(); } catch { }
    },

    async sendMessage(peerId: string, payload: any, multicast: boolean = false, peerIds?: string[]) {
        return WifiAware.sendMessage({ 
            peerId, 
            dataBase64: b64FromJson(payload),
            multicast,
            peerIds
        });
    },

    async sendFile(options: {
        peerId: string;
        filePath?: string;
        fileBase64?: string;
        fileName: string;
        mimeType?: string;
        multicast?: boolean;
        peerIds?: string[];
    }) {
        // Calling the new sendFileTransfer API that replaces sendFile
        const result = await WifiAware.sendFileTransfer({
            peerId: options.peerId,
            filePath: options.filePath,
            fileBase64: options.fileBase64,
            fileName: options.fileName,
            mimeType: options.mimeType || 'application/octet-stream',
            multicast: options.multicast,
            peerIds: options.peerIds
        });
        
        // Return the transferId for backward compatibility
        return result.transferId;
    },
    
    async sendFileTransfer(options: {
        peerId: string;
        filePath?: string;
        fileBase64?: string;
        fileName: string;
        mimeType?: string;
        multicast?: boolean;
        peerIds?: string[];
    }) {
        // Use the new API directly
        return WifiAware.sendFileTransfer({
            peerId: options.peerId,
            filePath: options.filePath,
            fileBase64: options.fileBase64,
            fileName: options.fileName,
            mimeType: options.mimeType || 'application/octet-stream',
            multicast: options.multicast,
            peerIds: options.peerIds
        });
    },

    async cancelFileTransfer(transferId: string) {
        return WifiAware.cancelFileTransfer(transferId);
    },

    async startSocket(options: {
        peerId: string;
        pskPassphrase: string;
        asServer?: boolean;
        multicastEnabled?: boolean;
        maxConnections?: number;
    }) {
        return WifiAware.startSocket({
            peerId: options.peerId,
            pskPassphrase: options.pskPassphrase,
            asServer: options.asServer,
            multicastEnabled: options.multicastEnabled,
            maxConnections: options.maxConnections
        });
    },

    async stopSocket(socketId?: string) {
        return WifiAware.stopSocket({ socketId });
    },

    // ✅ Typed wrapper: no more union→overload error
    on<K extends keyof EventMap>(event: K, cb: EventMap[K]) {
        // cast once here; callers stay strongly typed
        return (WifiAware as any).addListener(event, cb);
    },

    removeAllListeners() {
        return WifiAware.removeAllListeners();
    }
};
