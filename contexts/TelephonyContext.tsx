'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { VoicecenterWidgetCredentials, VoicecenterWidgetCall } from '@/types/voicecenter';

interface TelephonyConfig {
  provider: 'voicenter' | 'twilio' | null;
  isActive: boolean;
  credentials: {
    UserCode?: string;
    OrganizationCode?: string;
    // Widget credentials (for WebRTC)
    username?: string;
    password?: string;
    domain?: string;
  } | null;
}

interface ScreenPopData {
  caller: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  timestamp: Date;
}

interface TelephonyContextValue {
  config: TelephonyConfig | null;
  isLoading: boolean;
  isWidgetReady: boolean;
  currentCall: VoicecenterWidgetCall | null;
  screenPop: ScreenPopData | null;
  
  // Actions
  refreshConfig: () => Promise<void>;
  dismissScreenPop: () => void;
  initiateCall: (phoneNumber: string) => Promise<{ success: boolean; error?: string }>;
  
  // Widget credentials for VoicecenterWidget
  widgetCredentials: VoicecenterWidgetCredentials | null;
}

const TelephonyContext = createContext<TelephonyContextValue | null>(null);

export function useTelephony() {
  const ctx = useContext(TelephonyContext);
  if (!ctx) {
    throw new Error('useTelephony must be used within TelephonyProvider');
  }
  return ctx;
}

export function useTelephonyOptional() {
  return useContext(TelephonyContext);
}

interface TelephonyProviderProps {
  children: React.ReactNode;
  orgSlug: string;
}

export function TelephonyProvider({ children, orgSlug }: TelephonyProviderProps) {
  const [config, setConfig] = useState<TelephonyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [currentCall, setCurrentCall] = useState<VoicecenterWidgetCall | null>(null);
  const [screenPop, setScreenPop] = useState<ScreenPopData | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load telephony configuration
  const refreshConfig = useCallback(async () => {
    if (!orgSlug) return;
    
    try {
      setIsLoading(true);
      const res = await fetch(`/api/settings/telephony?tenantId=${encodeURIComponent(orgSlug)}`, {
        headers: { 'x-org-id': encodeURIComponent(orgSlug) },
      });
      
      if (res.ok) {
        const data = await res.json();
        const integration = data.integrations?.[0];
        
        if (integration) {
          // Fetch full credentials
          const credRes = await fetch(`/api/settings/telephony/credentials?tenantId=${encodeURIComponent(orgSlug)}`, {
            headers: { 'x-org-id': encodeURIComponent(orgSlug) },
          });
          
          let credentials = null;
          if (credRes.ok) {
            const credData = await credRes.json();
            credentials = credData.credentials || null;
          }
          
          setConfig({
            provider: integration.provider as 'voicenter' | 'twilio',
            isActive: integration.isActive,
            credentials,
          });
        } else {
          setConfig({ provider: null, isActive: false, credentials: null });
        }
      }
    } catch (error) {
      console.error('[TelephonyProvider] Failed to load config:', error);
      setConfig({ provider: null, isActive: false, credentials: null });
    } finally {
      setIsLoading(false);
    }
  }, [orgSlug]);

  // Initial load
  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  // Listen for screen pop events via SSE
  useEffect(() => {
    if (!orgSlug || !config?.isActive) return;

    // Set up SSE connection for real-time screen pop
    const setupSSE = () => {
      try {
        const eventSource = new EventSource(`/api/telephony/events?orgSlug=${encodeURIComponent(orgSlug)}`);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'screen-pop') {
              setScreenPop({
                caller: data.caller,
                leadId: data.leadId,
                leadName: data.leadName,
                leadPhone: data.leadPhone,
                timestamp: new Date(),
              });
            }
          } catch {
            // Ignore parse errors
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          // Retry after 5 seconds
          setTimeout(setupSSE, 5000);
        };

        eventSourceRef.current = eventSource;
      } catch {
        // SSE not supported or failed
      }
    };

    setupSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [orgSlug, config?.isActive]);

  // Dismiss screen pop
  const dismissScreenPop = useCallback(() => {
    setScreenPop(null);
  }, []);

  // Initiate a call using Click2Call
  const initiateCall = useCallback(async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
    if (!config?.isActive || !config?.credentials) {
      return { success: false, error: 'טלפוניה לא מוגדרת' };
    }

    try {
      const res = await fetch('/api/telephony/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': encodeURIComponent(orgSlug),
        },
        body: JSON.stringify({ to: phoneNumber }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'שגיאה בהפעלת השיחה' }));
        return { success: false, error: error.error || 'שגיאה בהפעלת השיחה' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'שגיאה בהתחברות לשרת' };
    }
  }, [config, orgSlug]);

  // Build widget credentials
  const widgetCredentials: VoicecenterWidgetCredentials | null = 
    config?.isActive && config?.credentials?.username && config?.credentials?.password && config?.credentials?.domain
      ? {
          username: config.credentials.username,
          password: config.credentials.password,
          domain: config.credentials.domain,
        }
      : null;

  // Handle widget events
  const handleIncomingCall = useCallback((call: VoicecenterWidgetCall) => {
    setCurrentCall(call);
  }, []);

  const handleCallEnded = useCallback(() => {
    setCurrentCall(null);
  }, []);

  // Expose widget event handlers via window for VoicecenterWidget
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    (window as unknown as Record<string, unknown>).__telephonyHandlers = {
      onIncomingCall: handleIncomingCall,
      onCallEnded: handleCallEnded,
      setWidgetReady: setIsWidgetReady,
    };

    return () => {
      delete (window as unknown as Record<string, unknown>).__telephonyHandlers;
    };
  }, [handleIncomingCall, handleCallEnded]);

  const value: TelephonyContextValue = {
    config,
    isLoading,
    isWidgetReady,
    currentCall,
    screenPop,
    refreshConfig,
    dismissScreenPop,
    initiateCall,
    widgetCredentials,
  };

  return (
    <TelephonyContext.Provider value={value}>
      {children}
    </TelephonyContext.Provider>
  );
}

export default TelephonyProvider;
