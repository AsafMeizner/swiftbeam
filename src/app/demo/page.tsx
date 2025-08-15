'use client';

import React, { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Minimal TS surface we use
type ListenerHandle = { remove: () => Promise<void> };

interface AttachResult {
    available: boolean;
    reason?: string;
    androidApiLevel?: number;
    instantCommSupported?: boolean;
}

interface WifiAwarePlugin {
    attach(): Promise<AttachResult>;
    publish(opts: {
        serviceName: string;
        serviceInfoBase64?: string;
        instantMode?: boolean;
        rangingEnabled?: boolean;
    }): Promise<void>;
    stopPublish(): Promise<void>;
    subscribe(opts: {
        serviceName: string;
        instantMode?: boolean;
        minDistanceMm?: number;
        maxDistanceMm?: number;
    }): Promise<void>;
    stopSubscribe(): Promise<void>;
    stopSocket(): Promise<void>;
    sendMessage?(msg: { peerId: string; dataBase64: string }): Promise<void>;
    addListener(
        eventName:
            | 'stateChanged'
            | 'serviceFound'
            | 'serviceLost'
            | 'messageReceived'
            | 'socketReady'
            | 'socketClosed',
        listener: (data: any) => void
    ): Promise<ListenerHandle>;
    removeAllListeners(): Promise<void>;
}

// Bind directly to the native plugin by name, no package import needed
const WifiAware = registerPlugin<WifiAwarePlugin>('WifiAware');

export default function WifiAwareDemo() {
    const [log, setLog] = useState<string[]>([]);
    const [attached, setAttached] = useState(false);
    const isNative = Capacitor.isNativePlatform();

    function push(...lines: string[]) {
        setLog(prev => [...prev, ...lines]);
    }

    useEffect(() => {
        if (!isNative) {
            push('Not running in a native container. Build & run with Capacitor.');
            return;
        }
        (async () => {
            try {
                const res = await WifiAware.attach();
                push('attach(): ' + JSON.stringify(res));
                setAttached(!!res.available);
                // listeners
                await WifiAware.addListener('stateChanged', s => push('stateChanged: ' + JSON.stringify(s)));
                await WifiAware.addListener('serviceFound', ev => push('serviceFound: ' + JSON.stringify(ev)));
                await WifiAware.addListener('serviceLost', ev => push('serviceLost: ' + JSON.stringify(ev)));
                await WifiAware.addListener('messageReceived', (m: { dataBase64: string }) =>
                    push('messageReceived: ' + (typeof atob === 'function' ? atob(m.dataBase64) : m.dataBase64))
                );
                await WifiAware.addListener('socketReady', s => push('socketReady: ' + JSON.stringify(s)));
                await WifiAware.addListener('socketClosed', () => push('socketClosed'));
            } catch (e: any) {
                push('attach() error: ' + (e?.message ?? String(e)));
            }
        })();
        return () => {
            WifiAware.removeAllListeners().catch(() => { });
        };
    }, []);

    const startPublisher = async () => {
        try {
            await WifiAware.publish({
                serviceName: 'aware-files', // <=15 chars, a-z0-9-
                serviceInfoBase64: typeof btoa === 'function' ? btoa(JSON.stringify({ v: 1 })) : undefined,
                instantMode: true,          // Android 13+ speeds discovery (lasts ~30s)
                rangingEnabled: true
            });
            push('publish(): ok');
        } catch (e: any) {
            push('publish() error: ' + (e?.message ?? String(e)));
        }
    };

    const startSubscriber = async () => {
        try {
            await WifiAware.subscribe({
                serviceName: 'aware-files',
                instantMode: true,
                minDistanceMm: 0,
                maxDistanceMm: 12000
            });
            push('subscribe(): ok');
        } catch (e: any) {
            push('subscribe() error: ' + (e?.message ?? String(e)));
        }
    };

    const stopAll = async () => {
        try { await WifiAware.stopPublish(); } catch { }
        try { await WifiAware.stopSubscribe(); } catch { }
        try { await WifiAware.stopSocket(); } catch { }
        push('stopped publish/subscribe/socket');
    };

    return (
        <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
            <h1>Wi-Fi Aware Demo</h1>
            {!isNative && <p>Run this page inside the Capacitor app on a device.</p>}
            <button onClick={startPublisher} disabled={!attached}>Start Publisher</button>{' '}
            <button onClick={startSubscriber} disabled={!attached}>Start Subscriber</button>{' '}
            <button onClick={stopAll}>Stop</button>

            <h3>Log</h3>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#111', color: '#0f0', padding: 12, minHeight: 200 }}>
                {log.join('\n')}
            </pre>
        </div>
    );
}
