'use client';

import { Capacitor } from '@capacitor/core';
import { WifiAware, type AttachResult } from '@asaf/wifi-aware';

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
type ServiceFoundEvt = { peerId: string; serviceName: string; distanceMm?: number; serviceInfoBase64?: string };
type ServiceLostEvt = { peerId: string; serviceName: string };
type MessageEvt = { peerId: string; dataBase64: string };
type SocketReadyEvt = { role: 'publisher' | 'subscriber'; localPort?: number; peerIpv6?: string; peerPort?: number };

type EventMap = {
    stateChanged: (s: AttachResult) => void;
    serviceFound: (ev: ServiceFoundEvt) => void;
    serviceLost: (ev: ServiceLostEvt) => void;
    messageReceived: (msg: MessageEvt) => void;
    socketReady: (res: SocketReadyEvt) => void;
    socketClosed: () => void;
};

export const WifiAwareCore = {
    SERVICE_NAME: 'swiftbeam',

    isNative() { return Capacitor.isNativePlatform(); },

    async ensureAttached(): Promise<boolean> {
        if (!this.isNative()) return false;
        try {
            const res = await WifiAware.attach();
            return !!res?.available;
        } catch { return false; }
    },

    publish(devicePayload: any) {
        return WifiAware.publish({
            serviceName: this.SERVICE_NAME,
            serviceInfoBase64: b64FromJson(devicePayload),
            instantMode: true,
            rangingEnabled: true,
        });
    },

    subscribe() {
        return WifiAware.subscribe({
            serviceName: this.SERVICE_NAME,
            instantMode: true,
            minDistanceMm: 0,
            maxDistanceMm: 20000,
        });
    },

    async stopAll() {
        try { await WifiAware.stopPublish(); } catch { }
        try { await WifiAware.stopSubscribe(); } catch { }
        try { await WifiAware.stopSocket(); } catch { }
    },

    async sendMessage(peerId: string, payload: any) {
        return WifiAware.sendMessage({ peerId, dataBase64: b64FromJson(payload) });
    },

    // ✅ Typed wrapper: no more union→overload error
    on<K extends keyof EventMap>(event: K, cb: EventMap[K]) {
        // cast once here; callers stay strongly typed
        return (WifiAware as any).addListener(event, cb);
    },
};
