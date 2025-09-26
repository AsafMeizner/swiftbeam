'use client';

import { WifiAwareCore } from '@/lib/wifiAwareCore';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';
export type LogSource = 'api' | 'event' | 'app' | 'plugin';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: LogSource;
  message: string;
  data?: any;
  tag?: string;
}

// Maximum number of log entries to keep
const MAX_LOG_ENTRIES = 1000;

class DevConsole {
  private static instance: DevConsole;
  private logs: LogEntry[] = [];
  private subscribers: Array<(logs: LogEntry[]) => void> = [];
  private initialized = false;
  private rawEvents: Record<string, any[]> = {};

  private constructor() {}

  static getInstance(): DevConsole {
    if (!DevConsole.instance) {
      DevConsole.instance = new DevConsole();
    }
    return DevConsole.instance;
  }

  /**
   * Initialize the DevConsole by attaching to WifiAwareCore events
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    this.initialized = true;
    
    // Define all event types we want to monitor
    const eventTypes = [
      'stateChanged',
      'serviceFound',
      'serviceLost',
      'messageReceived',
      'socketReady',
      'socketClosed',
      'peerConnected',
      'peerDisconnected',
      'fileTransferRequest',
      'fileTransferProgress',
      'fileTransferCompleted'
    ];
    
    // Set up event listeners for each event type
    for (const eventType of eventTypes) {
      // Keep track of raw events for each type
      if (!this.rawEvents[eventType]) {
        this.rawEvents[eventType] = [];
      }
      
      try {
        await WifiAwareCore.on(eventType as any, (data: any) => {
          // Store the raw event data
          const maxEventsPerType = 50;
          this.rawEvents[eventType].unshift(data);
          
          // Cap the number of events stored per type
          if (this.rawEvents[eventType].length > maxEventsPerType) {
            this.rawEvents[eventType] = this.rawEvents[eventType].slice(0, maxEventsPerType);
          }
          
          // Create a log entry for this event
          this.log('info', 'event', `${eventType}`, data, eventType);
        });
        
        this.log('debug', 'app', `Attached to ${eventType} events`);
      } catch (error) {
        this.log('error', 'app', `Failed to attach to ${eventType} events`, { error });
      }
    }
    
    // Monkey patch the core methods to log their inputs/outputs
    this.monkeyPatchCoreMethod('ensureAttached');
    this.monkeyPatchCoreMethod('getDeviceInfo');
    this.monkeyPatchCoreMethod('publish');
    this.monkeyPatchCoreMethod('subscribe');
    this.monkeyPatchCoreMethod('stopAll');
    this.monkeyPatchCoreMethod('sendMessage');
    this.monkeyPatchCoreMethod('sendFile');
    this.monkeyPatchCoreMethod('sendFileTransfer');
    this.monkeyPatchCoreMethod('cancelFileTransfer');
    this.monkeyPatchCoreMethod('startSocket');
    this.monkeyPatchCoreMethod('stopSocket');
    
    this.log('info', 'app', 'DevConsole initialized');
  }
  
  /**
   * Monkey patch a WifiAwareCore method to log its inputs and outputs
   */
  private monkeyPatchCoreMethod(methodName: string): void {
    const originalMethod = (WifiAwareCore as any)[methodName];
    if (typeof originalMethod !== 'function') return;
    
    (WifiAwareCore as any)[methodName] = async (...args: any[]) => {
      const inputTime = new Date();
      this.log('debug', 'api', `${methodName} called`, { args }, 'input');
      
      try {
        const result = await originalMethod.apply(WifiAwareCore, args);
        
        // Calculate response time
        const responseTime = new Date().getTime() - inputTime.getTime();
        
        this.log('debug', 'api', `${methodName} returned after ${responseTime}ms`, { result }, 'output');
        return result;
      } catch (error) {
        this.log('error', 'api', `${methodName} failed`, { error, args }, 'error');
        throw error;
      }
    };
  }
  
  /**
   * Get the current broadcast payload if available
   */
  getBroadcastPayload(): any {
    // Extract the payload from the publish method calls
    const publishEvents = this.logs.filter(
      log => log.source === 'api' && log.message === 'publish called'
    );
    
    if (publishEvents.length > 0) {
      return publishEvents[0].data?.args?.[0] || null;
    }
    
    return null;
  }
  
  /**
   * Get raw plugin events by type
   */
  getRawEvents(eventType?: string): Record<string, any[]> {
    if (eventType) {
      return { [eventType]: this.rawEvents[eventType] || [] };
    }
    return this.rawEvents;
  }

  /**
   * Add a log entry
   */
  log(level: LogLevel, source: LogSource, message: string, data?: any, tag?: string): LogEntry {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      source,
      message,
      data,
      tag,
    };

    this.logs.unshift(entry);

    // Limit the number of logs
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(0, MAX_LOG_ENTRIES);
    }

    // Notify subscribers
    this.notifySubscribers();

    return entry;
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.notifySubscribers();
  }

  /**
   * Subscribe to log updates
   */
  subscribe(callback: (logs: LogEntry[]) => void): () => void {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    const logs = this.getLogs();
    this.subscribers.forEach(callback => {
      try {
        callback(logs);
      } catch (error) {
        console.error('Error in log subscriber:', error);
      }
    });
  }
}

export const devConsole = DevConsole.getInstance();

// React hook for using logs in components
export function useLogs() {
  const [logs, setLogs] = React.useState<LogEntry[]>(devConsole.getLogs());

  React.useEffect(() => {
    // Subscribe to log updates
    const unsubscribe = devConsole.subscribe(setLogs);
    
    // Initialize the console if needed
    devConsole.initialize().catch(console.error);
    
    return unsubscribe;
  }, []);

  return {
    logs,
    clearLogs: () => devConsole.clearLogs(),
    log: (level: LogLevel, source: LogSource, message: string, data?: any, tag?: string) =>
      devConsole.log(level, source, message, data, tag),
    getBroadcastPayload: () => devConsole.getBroadcastPayload(),
    getRawEvents: (eventType?: string) => devConsole.getRawEvents(eventType)
  };
}

// Initialize the DevConsole immediately if window is defined
if (typeof window !== 'undefined') {
  // Delay initialization to ensure React app is loaded first
  setTimeout(() => {
    devConsole.initialize().catch(console.error);
  }, 1000);
}

// Helper function to explicitly import React in client components
import React from 'react';
