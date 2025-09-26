'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { WifiAwareCore } from '@/lib/wifiAwareCore';
import { useLogs, LogEntry, LogLevel, LogSource } from '@/utils/devConsole';
import { Capacitor } from '@capacitor/core';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getWiFiAwareBroadcastService } from "@/services/wifiAwareBroadcast";

// Helper function to format dates nicely
function formatDate(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + 
    '.' + date.getMilliseconds().toString().padStart(3, '0');
}

// Component for displaying a log entry
function LogEntryItem({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const levelColors: Record<LogLevel, string> = {
    debug: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  };

  const sourceColors: Record<LogSource, string> = {
    api: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    event: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    app: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
    plugin: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 py-2 px-2 hover:bg-gray-50 dark:hover:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
        <Badge variant="outline" className={levelColors[entry.level]}>{entry.level}</Badge>
        <Badge variant="outline" className={sourceColors[entry.source]}>{entry.source}</Badge>
        {entry.tag && <Badge>{entry.tag}</Badge>}
        <span className="font-mono text-sm">{entry.message}</span>
      </div>

      {entry.data && (
        <div className="mt-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {expanded ? "Hide" : "Show"} data
          </button>
          
          {expanded && (
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(entry.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// Log viewer component
function LogViewer() {
  const { logs, clearLogs } = useLogs();
  const [filter, setFilter] = useState({
    level: 'all' as 'all' | LogLevel,
    source: 'all' as 'all' | LogSource,
    search: '',
    tag: 'all'
  });

  const filteredLogs = logs.filter((log) => {
    // Apply level filter
    if (filter.level !== 'all' && log.level !== filter.level) return false;
    
    // Apply source filter
    if (filter.source !== 'all' && log.source !== filter.source) return false;
    
    // Apply tag filter
    if (filter.tag !== 'all' && log.tag !== filter.tag) return false;
    
    // Apply search filter
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) {
      // Also check if data contains the search term
      if (!log.data || !JSON.stringify(log.data).toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });

  // Extract unique tags for filtering
  const uniqueTags = Array.from(new Set(logs.map(log => log.tag).filter(Boolean as unknown as (tag: string | undefined) => tag is string)));

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Live Log Viewer</CardTitle>
        <CardDescription>
          Real-time WiFi Aware events and API calls
        </CardDescription>
      </CardHeader>

      <div className="px-6 pb-2 flex flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Label htmlFor="level-filter" className="text-xs">Level</Label>
          <Select
            value={filter.level}
            onValueChange={(value) => setFilter({...filter, level: value as any})}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Label htmlFor="source-filter" className="text-xs">Source</Label>
          <Select
            value={filter.source}
            onValueChange={(value) => setFilter({...filter, source: value as any})}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="app">App</SelectItem>
              <SelectItem value="plugin">Plugin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {uniqueTags.length > 0 && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="tag-filter" className="text-xs">Event Type</Label>
            <Select
              value={filter.tag}
              onValueChange={(value) => setFilter({...filter, tag: value})}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {uniqueTags.map((tag) => (
                  // Only render SelectItem if tag is not empty
                  tag ? <SelectItem key={tag} value={tag}>{tag}</SelectItem> : null
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center flex-1 min-w-[200px]">
          <Input
            placeholder="Search logs..."
            className="h-8"
            value={filter.search}
            onChange={(e) => setFilter({...filter, search: e.target.value})}
          />
        </div>
        
        <Button size="sm" variant="outline" onClick={clearLogs}>
          Clear
        </Button>
      </div>

      <CardContent className="pt-0 pb-0 flex-grow overflow-hidden">
        <ScrollArea className="h-[calc(100vh-300px)] border rounded-md">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <LogEntryItem key={log.id} entry={log} />
            ))
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500">
              No logs match your filters
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="pt-2 text-xs text-gray-500">
        Showing {filteredLogs.length} of {logs.length} logs
      </CardFooter>
    </Card>
  );
}

// Method call component
interface MethodCallProps {
  methodName: string;
  description: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'json' | 'select';
    options?: string[];
    required?: boolean;
    defaultValue?: any;
    placeholder?: string;
    description?: string;
  }[];
  onSubmit: (params: any) => Promise<any>;
}

function MethodCall({ methodName, description, parameters, onSubmit }: MethodCallProps) {
  const [params, setParams] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{success: boolean; data?: any; error?: any} | null>(null);
  const { log } = useLogs();

  useEffect(() => {
    // Set default values
    const defaultParams: Record<string, any> = {};
    parameters.forEach(p => {
      if (p.defaultValue !== undefined) {
        defaultParams[p.name] = p.defaultValue;
      }
    });
    setParams(defaultParams);
  }, [parameters]);

  const handleParamChange = useCallback((name: string, value: any) => {
    setParams(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleSubmit = async () => {
    setIsLoading(true);
    setResponse(null);

    try {
      log('info', 'app', `Calling method: ${methodName}`, params);
      const result = await onSubmit(params);
      log('info', 'app', `Method ${methodName} result:`, result);
      setResponse({ success: true, data: result });
    } catch (error) {
      log('error', 'app', `Method ${methodName} failed:`, error);
      setResponse({ success: false, error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex flex-wrap justify-between items-center mb-3">
        <div>
          <h3 className="font-semibold text-lg">{methodName}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || parameters.some(p => p.required && !params[p.name])}
        >
          {isLoading ? "Executing..." : "Execute"}
        </Button>
      </div>

      {parameters.length > 0 && (
        <div className="grid gap-4 mb-4">
          {parameters.map(param => (
            <div key={param.name} className="grid gap-2">
              <Label htmlFor={param.name} className="flex items-center gap-1">
                {param.name}
                {param.required && <span className="text-red-500">*</span>}
                {param.description && (
                  <span className="text-xs text-gray-500 ml-1">({param.description})</span>
                )}
              </Label>

              {param.type === 'string' && (
                <Input
                  id={param.name}
                  value={params[param.name] || ''}
                  placeholder={param.placeholder}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                />
              )}

              {param.type === 'number' && (
                <Input
                  id={param.name}
                  type="number"
                  value={params[param.name] || ''}
                  placeholder={param.placeholder}
                  onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
                />
              )}

              {param.type === 'boolean' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={param.name}
                    checked={!!params[param.name]}
                    onCheckedChange={(checked: boolean) => handleParamChange(param.name, !!checked)}
                  />
                  <label
                    htmlFor={param.name}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {param.placeholder || "Enabled"}
                  </label>
                </div>
              )}

              {param.type === 'json' && (
                <Textarea
                  id={param.name}
                  value={params[param.name] ? JSON.stringify(params[param.name], null, 2) : ''}
                  placeholder={param.placeholder || "Enter JSON..."}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    try {
                      const value = e.target.value.trim() ? JSON.parse(e.target.value) : undefined;
                      handleParamChange(param.name, value);
                    } catch {
                      // Don't update if invalid JSON
                    }
                  }}
                  rows={5}
                  className="font-mono text-sm"
                />
              )}

              {param.type === 'select' && param.options && (
                <Select
                  value={params[param.name] || ''}
                  onValueChange={(value) => handleParamChange(param.name, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={param.placeholder || `Select ${param.name}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {param.options.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      )}

      {response && (
        <div className={`mt-4 p-3 rounded text-sm ${response.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <div className="font-medium mb-1">{response.success ? 'Success' : 'Error'}</div>
          <pre className="text-xs overflow-auto max-h-60">
            {JSON.stringify(response.success ? response.data : response.error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// WiFi Aware status component
function WifiAwareStatus() {
  const [status, setStatus] = useState({
    isNative: false,
    attached: false,
    attachReason: '',
    broadcasting: false
  });
  
  const refreshStatus = useCallback(async () => {
    const isNative = WifiAwareCore.isNative();
    let attachResult = { available: false, reason: 'Not checked' };
    
    if (isNative) {
      try {
        const result = await WifiAwareCore.ensureAttached();
        attachResult = { 
          available: result.available, 
          reason: result.reason || 'No reason provided' 
        };
      } catch (err) {
        attachResult = { available: false, reason: String(err) };
      }
    }
    
    const broadcastService = getWiFiAwareBroadcastService();
    const broadcasting = broadcastService.isBroadcasting();
    
    setStatus({
      isNative,
      attached: attachResult.available,
      attachReason: attachResult.reason,
      broadcasting
    });
  }, []);

  // Check status on initial render
  useEffect(() => {
    refreshStatus();
    
    // Check status periodically
    const interval = setInterval(refreshStatus, 10000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>WiFi Aware Status</CardTitle>
        <CardDescription>Current state of the WiFi Aware system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Native Platform</p>
            <div className="flex items-center">
              {status.isNative ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Yes
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                  No (Web)
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">WiFi Aware Attached</p>
            <div className="flex items-center">
              {status.attached ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                  Not Available
                </Badge>
              )}
            </div>
            {!status.attached && status.attachReason && (
              <p className="text-xs text-red-500">{status.attachReason}</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Broadcasting Status</p>
            <div className="flex items-center">
              {status.broadcasting ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  Inactive
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Device Platform</p>
            <div className="flex items-center">
              <Badge variant="outline">
                {Capacitor.getPlatform()}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" onClick={refreshStatus}>Refresh Status</Button>
      </CardFooter>
    </Card>
  );
}

// Broadcast payload inspector component
function BroadcastPayloadInspector() {
  const { getBroadcastPayload } = useLogs();
  const [payload, setPayload] = useState<any>(null);
  
  // Refresh payload when needed
  const refreshPayload = useCallback(() => {
    const currentPayload = getBroadcastPayload();
    setPayload(currentPayload);
  }, [getBroadcastPayload]);

  // Get payload on initial render and set up periodic refresh
  useEffect(() => {
    refreshPayload();
    
    const interval = setInterval(refreshPayload, 5000);
    return () => clearInterval(interval);
  }, [refreshPayload]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Broadcast Payload</CardTitle>
        <CardDescription>The exact data being broadcast by the WiFi Aware plugin</CardDescription>
      </CardHeader>
      <CardContent>
        {payload ? (
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-48 text-xs">
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-20 text-gray-500">
            No active broadcast payload detected
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button size="sm" onClick={refreshPayload}>Refresh Payload</Button>
      </CardFooter>
    </Card>
  );
}

// Raw events viewer component
function RawEventsViewer() {
  const { getRawEvents } = useLogs();
  const [selectedEventType, setSelectedEventType] = useState<string | undefined>(undefined);
  const [rawEvents, setRawEvents] = useState<Record<string, any[]>>({});
  
  const refreshEvents = useCallback(() => {
    setRawEvents(getRawEvents(selectedEventType));
  }, [getRawEvents, selectedEventType]);

  useEffect(() => {
    refreshEvents();
    const interval = setInterval(refreshEvents, 5000);
    return () => clearInterval(interval);
  }, [refreshEvents]);

  const eventTypes = Object.keys(rawEvents);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raw Plugin Events</CardTitle>
        <CardDescription>The raw event data received from the WiFi Aware plugin</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select
            value={selectedEventType || 'all_events'}
            onValueChange={(value) => setSelectedEventType(value === 'all_events' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_events">All event types</SelectItem>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Accordion type="single" collapsible>
          {eventTypes.map((eventType) => (
            <AccordionItem key={eventType} value={eventType}>
              <AccordionTrigger className="text-sm">
                {eventType} 
                <span className="ml-2 text-xs text-gray-500">
                  ({rawEvents[eventType]?.length || 0} events)
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="max-h-60">
                  {rawEvents[eventType]?.length > 0 ? (
                    rawEvents[eventType].map((event, index) => (
                      <div key={index} className="mb-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                        <pre className="text-xs overflow-auto max-h-40 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                          {JSON.stringify(event, null, 2)}
                        </pre>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm p-2">No events captured</div>
                  )}
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter>
        <Button size="sm" onClick={refreshEvents}>Refresh Events</Button>
      </CardFooter>
    </Card>
  );
}

// Main dev page component
export default function DevPage() {
  return (
    <main className="container py-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">SwiftBeam Developer Tools</h1>
          <p className="text-gray-500 mt-1">
            Debug and test the WiFi Aware plugin with direct access to raw inputs/outputs
          </p>
        </div>
        
        <Tabs defaultValue="status">
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="api">API Methods</TabsTrigger>
            <TabsTrigger value="events">Raw Events</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WifiAwareStatus />
              <BroadcastPayloadInspector />
            </div>
            <RawEventsViewer />
          </TabsContent>

          <TabsContent value="api">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>WiFi Aware Core API</CardTitle>
                  <CardDescription>
                    Directly call methods from the WiFi Aware Core API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MethodCall
                    methodName="ensureAttached"
                    description="Ensure WiFi Aware is attached and available"
                    parameters={[]}
                    onSubmit={async () => {
                      return await WifiAwareCore.ensureAttached();
                    }}
                  />
                  
                  <MethodCall
                    methodName="publish"
                    description="Publish your device presence with a payload"
                    parameters={[
                      {
                        name: "payload",
                        type: "json",
                        required: true,
                        placeholder: '{ "deviceId": "...", "name": "My Device", "platform": "android" }',
                        defaultValue: {
                          deviceId: crypto.randomUUID(),
                          name: "Test Device",
                          platform: Capacitor.getPlatform(),
                          visibility: "everyone",
                          allowPreview: true,
                          v: 1,
                          ts: Date.now()
                        }
                      }
                    ]}
                    onSubmit={async (params) => {
                      return await WifiAwareCore.publish(params.payload);
                    }}
                  />
                  
                  <MethodCall
                    methodName="subscribe"
                    description="Subscribe to peer devices in range"
                    parameters={[]}
                    onSubmit={async () => {
                      return await WifiAwareCore.subscribe();
                    }}
                  />
                  
                  <MethodCall
                    methodName="stopAll"
                    description="Stop all publish/subscribe sessions"
                    parameters={[]}
                    onSubmit={async () => {
                      return await WifiAwareCore.stopAll();
                    }}
                  />

                  <MethodCall
                    methodName="getDeviceInfo"
                    description="Get info about a peer device"
                    parameters={[
                      {
                        name: "peerId",
                        type: "string",
                        required: true,
                        placeholder: "Peer device ID"
                      }
                    ]}
                    onSubmit={async (params) => {
                      return await WifiAwareCore.getDeviceInfo(params.peerId);
                    }}
                  />
                  
                  <MethodCall
                    methodName="sendMessage"
                    description="Send a message to a peer device"
                    parameters={[
                      {
                        name: "peerId",
                        type: "string",
                        required: true,
                        placeholder: "Peer device ID"
                      },
                      {
                        name: "payload",
                        type: "json",
                        required: true,
                        placeholder: '{ "type": "hello", "message": "Hello world!" }',
                        defaultValue: {
                          type: "test-message",
                          message: "Test message from dev console",
                          timestamp: Date.now()
                        }
                      },
                      {
                        name: "multicast",
                        type: "boolean",
                        required: false,
                        defaultValue: false
                      },
                      {
                        name: "peerIds",
                        type: "json",
                        required: false,
                        placeholder: '["peerId1", "peerId2"]'
                      }
                    ]}
                    onSubmit={async (params) => {
                      return await WifiAwareCore.sendMessage(
                        params.peerId, 
                        params.payload, 
                        params.multicast, 
                        params.peerIds
                      );
                    }}
                  />
                  
                  <MethodCall
                    methodName="sendFileTransfer"
                    description="Send a file to a peer device"
                    parameters={[
                      {
                        name: "options",
                        type: "json",
                        required: true,
                        placeholder: '{ "peerId": "...", "fileName": "test.txt", "fileBase64": "..." }',
                        defaultValue: {
                          peerId: "",
                          fileName: "test.txt",
                          fileBase64: "VGhpcyBpcyBhIHRlc3QgZmlsZSBmcm9tIFN3aWZ0QmVhbSBkZXYgY29uc29sZQ==",
                          mimeType: "text/plain"
                        }
                      }
                    ]}
                    onSubmit={async (params) => {
                      return await WifiAwareCore.sendFileTransfer(params.options);
                    }}
                  />
                  
                  <MethodCall
                    methodName="cancelFileTransfer"
                    description="Cancel an ongoing file transfer"
                    parameters={[
                      {
                        name: "transferId",
                        type: "string",
                        required: true,
                        placeholder: "Transfer ID"
                      }
                    ]}
                    onSubmit={async (params) => {
                      return await WifiAwareCore.cancelFileTransfer(params.transferId);
                    }}
                  />
                </CardContent>
              </Card>
              
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Broadcast Service API</CardTitle>
                  <CardDescription>
                    Call methods from the WiFi Aware Broadcast Service
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MethodCall
                    methodName="startBroadcasting"
                    description="Start broadcasting your device presence"
                    parameters={[]}
                    onSubmit={async () => {
                      const service = getWiFiAwareBroadcastService();
                      return await service.startBroadcasting();
                    }}
                  />
                  
                  <MethodCall
                    methodName="stopBroadcasting"
                    description="Stop broadcasting your device presence"
                    parameters={[]}
                    onSubmit={async () => {
                      const service = getWiFiAwareBroadcastService();
                      return await service.stopBroadcasting();
                    }}
                  />
                  
                  <MethodCall
                    methodName="updateSettings"
                    description="Update broadcast settings"
                    parameters={[
                      {
                        name: "settings",
                        type: "json",
                        required: true,
                        placeholder: '{ "enabled": true, "deviceName": "My Device" }',
                        defaultValue: {
                          enabled: true,
                          deviceName: "Dev Console Device",
                          visibility: "everyone",
                          autoAcceptFromTrustedDevices: false,
                          allowPreview: true,
                          maxFileSize: 100 * 1024 * 1024,
                        }
                      }
                    ]}
                    onSubmit={async (params) => {
                      const service = getWiFiAwareBroadcastService();
                      await service.updateSettings(params.settings);
                      return service.getSettings();
                    }}
                  />
                  
                  <MethodCall
                    methodName="getSettings"
                    description="Get current broadcast settings"
                    parameters={[]}
                    onSubmit={async () => {
                      const service = getWiFiAwareBroadcastService();
                      return service.getSettings();
                    }}
                  />
                  
                  <MethodCall
                    methodName="getPendingRequests"
                    description="Get pending file transfer requests"
                    parameters={[]}
                    onSubmit={async () => {
                      const service = getWiFiAwareBroadcastService();
                      return service.getPendingRequests();
                    }}
                  />
                  
                  <MethodCall
                    methodName="getAllTransfers"
                    description="Get all active transfers"
                    parameters={[]}
                    onSubmit={async () => {
                      const service = getWiFiAwareBroadcastService();
                      return service.getAllTransfers();
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="events">
            <RawEventsViewer />
          </TabsContent>
          
          <TabsContent value="logs">
            <LogViewer />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}