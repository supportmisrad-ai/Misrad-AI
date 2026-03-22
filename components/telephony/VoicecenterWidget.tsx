'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { 
  VoicecenterWidgetCredentials, 
  VoicecenterWidgetTheme,
  VoicecenterWidgetCall 
} from '@/types/voicecenter';

interface VoicecenterWidgetProps {
  /**
   * Voicenter Widget credentials
   * Get these from Voicenter dashboard
   */
  credentials?: VoicecenterWidgetCredentials;
  
  /**
   * Organization slug for context
   */
  orgSlug: string;

  /**
   * Theme customization (optional)
   */
  theme?: Partial<VoicecenterWidgetTheme>;

  /**
   * Callback when a call is received
   */
  onIncomingCall?: (call: VoicecenterWidgetCall) => void;

  /**
   * Callback when a call is answered
   */
  onCallAnswered?: (call: VoicecenterWidgetCall) => void;

  /**
   * Callback when a call ends
   */
  onCallEnded?: (call: VoicecenterWidgetCall) => void;
}

/**
 * VoicecenterWidget - WebRTC softphone widget
 * 
 * This component embeds Voicenter's OpenSIPS WebRTC widget for making and receiving calls
 * directly in the browser.
 * 
 * @see https://widget.voicenter.com/example
 */
export default function VoicecenterWidget({ 
  credentials, 
  orgSlug, 
  theme,
  onIncomingCall,
  onCallAnswered,
  onCallEnded 
}: VoicecenterWidgetProps) {
  const widgetRef = useRef<HTMLElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!credentials?.username || !credentials?.password || !credentials?.domain) {
      console.log('[VoicecenterWidget] Waiting for credentials');
      return;
    }

    // Load the OpenSIPS widget script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.opensipsjs.org/opensipsjs-widget/v0.2.39/opensipsjs-widget.mjs';
    
    script.onload = async () => {
      try {
        // Create widget element
        const widgetElement = document.createElement('opensips-widget');
        widgetElement.id = 'openSIPSWidget';
        
        const container = document.getElementById('voicecenter-widget-container');
        if (!container) {
          setError('Widget container not found');
          return;
        }
        
        container.appendChild(widgetElement);
        widgetRef.current = widgetElement;

        // Wait for widget to be ready
        widgetElement.addEventListener('widget:ready', async (event: Event) => {
          const customEvent = event as CustomEvent;
          const OpenSIPSWidget = customEvent.detail;

          // Default theme settings
          const defaultTheme: VoicecenterWidgetTheme = {
            colors: {
              primary: '#5E95E8',
              secondary: '#0d8099',
              'main-text': '#414C59',
              'secondary-text': '#8292A5',
              'button-pressed-text': '#FFF',
              'border-lines': '#F3F3F3',
              'primary-bg': '#FFF',
              'secondary-bg': '#F0F2F4',
              'inactive-bg': '#F2F6FF',
              success: '#7CC24F',
              danger: '#EC2A2A',
              'additional-danger-bg': '#F44C4C',
              'additional-success-bg': '#75B8A0',
              'draggable-bg': '#FFF',
            },
            widgetType: 'audio',
            lang: 'he',
            audioConfig: {
              layoutConfig: {
                type: 'rounded',
                mode: 'floating',
                position: {
                  anchor: 'bottom-center',
                },
                keypadMode: 'popover',
                keypadPosition: 'bottom',
              },
              noiseReductionOptions: {
                mode: 'dynamic',
              },
            },
          };

          // Merge with custom theme
          const themeSettings = {
            ...defaultTheme,
            ...theme,
            colors: {
              ...defaultTheme.colors,
              ...theme?.colors,
            },
          };

          const callSettings = {
            showKeypad: true,
            allowTransfer: true,
            mergeCalls: true,
            outgoingCalls: true,
            shrinkOnIdle: true,
            displayName: true,
            displayCallerID: true,
            maskCallerID: false,
            allowChangingAutoAnswer: true,
            defaultAutoAnswer: false,
            allowChangingDND: true,
            defaultDND: false,
            incomingCallWaitingBehaviour: 'accept' as const,
          };

          // Initialize widget API
          const widgetAPI = new OpenSIPSWidget({
            themeSettings,
            callSettings,
          });

          // Login with credentials
          await widgetAPI.login(credentials);

          // Set up event listeners
          widgetAPI.on('callIncoming', (call: VoicecenterWidgetCall) => {
            console.log('[VoicecenterWidget] Incoming call:', call);
            onIncomingCall?.(call);
          });

          widgetAPI.on('callAnswered', (call: VoicecenterWidgetCall) => {
            console.log('[VoicecenterWidget] Call answered:', call);
            onCallAnswered?.(call);
          });

          widgetAPI.on('callEnded', (call: VoicecenterWidgetCall) => {
            console.log('[VoicecenterWidget] Call ended:', call);
            onCallEnded?.(call);
          });

          setIsLoaded(true);
          console.log('[VoicecenterWidget] Widget initialized successfully');
        });

      } catch (err) {
        console.error('[VoicecenterWidget] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize widget');
      }
    };

    script.onerror = () => {
      setError('Failed to load widget script');
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (widgetRef.current) {
        widgetRef.current.remove();
      }
      script.remove();
    };
  }, [credentials, theme, onIncomingCall, onCallAnswered, onCallEnded]);

  // Show placeholder if no credentials
  if (!credentials?.username || !credentials?.password || !credentials?.domain) {
    return (
      <div className="fixed bottom-4 left-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 shadow-lg max-w-sm z-50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <span className="text-2xl">☎️</span>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-1">Voicenter Widget</div>
            <div className="text-sm text-slate-600 leading-relaxed">
              ממתין לפרטי התחברות.
              <br />
              יש להגדיר Username, Password ו-Domain בהגדרות המערכת.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if failed to load
  if (error) {
    return (
      <div className="fixed bottom-4 left-4 bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg max-w-sm z-50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <div className="font-bold text-red-800 mb-1">שגיאה בטעינת Widget</div>
            <div className="text-sm text-red-600 leading-relaxed">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="voicecenter-widget-container" 
      className="fixed bottom-4 left-4 z-50"
      data-org-slug={orgSlug}
      data-loaded={isLoaded}
    >
      {/* Widget will be injected here by OpenSIPS script */}
    </div>
  );
}
