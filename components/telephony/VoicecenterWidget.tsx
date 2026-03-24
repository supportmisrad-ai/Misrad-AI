'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, X, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import type { 
  VoicecenterWidgetCredentials, 
  VoicecenterWidgetTheme,
  VoicecenterWidgetCall 
} from '@/types/voicecenter';

interface VoicecenterWidgetProps {
  credentials?: VoicecenterWidgetCredentials;
  orgSlug: string;
  theme?: Partial<VoicecenterWidgetTheme>;
  onIncomingCall?: (call: VoicecenterWidgetCall) => void;
  onCallAnswered?: (call: VoicecenterWidgetCall) => void;
  onCallEnded?: (call: VoicecenterWidgetCall) => void;
}

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

interface ActiveCall {
  id: string;
  number: string;
  direction: 'incoming' | 'outgoing';
  state: CallState;
  startTime?: Date;
  duration?: number;
}

export default function VoicecenterWidget({ 
  credentials, 
  orgSlug, 
  theme,
  onIncomingCall,
  onCallAnswered,
  onCallEnded 
}: VoicecenterWidgetProps) {
  const widgetRef = useRef<HTMLElement | null>(null);
  const widgetAPIRef = useRef<unknown>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Format duration as mm:ss
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Call timer effect
  useEffect(() => {
    if (activeCall?.state !== 'connected') return;
    
    const interval = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeCall?.state]);

  // Reset timer when call ends
  useEffect(() => {
    if (activeCall?.state === 'ended') {
      setTimeout(() => {
        setActiveCall(null);
        setCallTimer(0);
      }, 2000);
    }
  }, [activeCall?.state]);

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

          // Set up event listeners with state management
          widgetAPI.on('callIncoming', (call: VoicecenterWidgetCall) => {
            console.log('[VoicecenterWidget] Incoming call:', call);
            setActiveCall({
              id: call.id,
              number: call.remoteIdentity,
              direction: 'incoming',
              state: 'ringing',
            });
            setIsExpanded(true);
            onIncomingCall?.(call);
          });

          widgetAPI.on('callOutgoing', (call: VoicecenterWidgetCall) => {
            console.log('[VoicecenterWidget] Outgoing call:', call);
            setActiveCall({
              id: call.id,
              number: call.remoteIdentity,
              direction: 'outgoing',
              state: 'calling',
            });
          });

          widgetAPI.on('callAnswered', (call: VoicecenterWidgetCall) => {
            console.log('[VoicecenterWidget] Call answered:', call);
            setActiveCall(prev => prev ? {
              ...prev,
              state: 'connected',
              startTime: new Date(),
            } : null);
            onCallAnswered?.(call);
          });

          widgetAPI.on('callEnded', (call: VoicecenterWidgetCall) => {
            console.log('[VoicecenterWidget] Call ended:', call);
            setActiveCall(prev => prev ? { ...prev, state: 'ended' } : null);
            onCallEnded?.(call);
          });

          // Store API reference for making calls
          widgetAPIRef.current = widgetAPI;
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

  // Make a call
  const handleMakeCall = useCallback(() => {
    if (!phoneNumber || !widgetAPIRef.current) return;
    
    const api = widgetAPIRef.current as { makeCall: (number: string) => Promise<void> };
    api.makeCall(phoneNumber).catch((err: Error) => {
      console.error('[VoicecenterWidget] Failed to make call:', err);
    });
  }, [phoneNumber]);

  // Hangup call
  const handleHangup = useCallback(() => {
    if (!activeCall || !widgetAPIRef.current) return;
    
    const api = widgetAPIRef.current as { hangupCall: (id: string) => Promise<void> };
    api.hangupCall(activeCall.id).catch((err: Error) => {
      console.error('[VoicecenterWidget] Failed to hangup:', err);
    });
    setActiveCall(prev => prev ? { ...prev, state: 'ended' } : null);
  }, [activeCall]);

  // Answer incoming call
  const handleAnswer = useCallback(() => {
    if (!activeCall || !widgetAPIRef.current) return;
    
    const api = widgetAPIRef.current as { answerCall: (id: string) => Promise<void> };
    api.answerCall(activeCall.id).catch((err: Error) => {
      console.error('[VoicecenterWidget] Failed to answer:', err);
    });
  }, [activeCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    // TODO: Implement actual mute via widget API when available
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
    // TODO: Implement actual speaker toggle via widget API when available
  }, []);

  // Handle key press on dialpad
  const handleKeyPress = useCallback((key: string) => {
    setPhoneNumber(prev => prev + key);
  }, []);

  // Pro Minimalist: Don't render if no credentials
  if (!credentials?.username || !credentials?.password || !credentials?.domain) {
    return null;
  }

  // Pro Minimalist: Compact error state
  if (error) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-sm">⚠️</span>
            </div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Compact dialpad keys
  const dialKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <>
      {/* Hidden container for OpenSIPS widget */}
      <div id="voicecenter-widget-container" className="hidden" data-org-slug={orgSlug} />
      
      {/* Pro Minimalist Floating Phone Widget */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
        {/* Active Call Panel */}
        {activeCall && (
          <div className={`
            bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden
            transition-all duration-300 ease-out
            ${activeCall.state === 'ringing' ? 'animate-pulse' : ''}
          `}>
            {/* Call Status Header */}
            <div className={`
              px-4 py-3 flex items-center gap-3
              ${activeCall.state === 'connected' ? 'bg-green-500' : 
                activeCall.state === 'ringing' ? 'bg-amber-500' : 
                activeCall.state === 'calling' ? 'bg-blue-500' : 'bg-slate-500'}
            `}>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">
                  {activeCall.number}
                </div>
                <div className="text-white/80 text-xs">
                  {activeCall.state === 'ringing' && activeCall.direction === 'incoming' && 'שיחה נכנסת...'}
                  {activeCall.state === 'ringing' && activeCall.direction === 'outgoing' && 'מצלצל...'}
                  {activeCall.state === 'calling' && 'מתחבר...'}
                  {activeCall.state === 'connected' && formatDuration(callTimer)}
                  {activeCall.state === 'ended' && 'השיחה הסתיימה'}
                </div>
              </div>
            </div>

            {/* Call Controls */}
            <div className="p-3 flex items-center gap-2">
              {activeCall.state === 'ringing' && activeCall.direction === 'incoming' ? (
                <>
                  <button
                    onClick={handleAnswer}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="text-sm font-medium">מענה</span>
                  </button>
                  <button
                    onClick={handleHangup}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-colors"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span className="text-sm font-medium">דחייה</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleMute}
                    className={`p-3 rounded-xl transition-colors ${
                      isMuted ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={toggleSpeaker}
                    className={`p-3 rounded-xl transition-colors ${
                      isSpeakerOn ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleHangup}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-colors"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span className="text-sm font-medium">ניתוק</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Collapsed / Dialer View */}
        {isExpanded && !activeCall ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 w-[280px]">
            {/* Phone Input */}
            <div className="relative mb-3">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="הזן מספר טלפון"
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-mono text-center outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {phoneNumber && (
                <button
                  onClick={() => setPhoneNumber('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dialpad */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {dialKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="aspect-square bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl flex items-center justify-center text-lg font-semibold text-slate-700 transition-colors"
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Call Button */}
            <button
              onClick={handleMakeCall}
              disabled={!phoneNumber}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span className="font-medium">חיוג</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full mt-2 text-slate-400 hover:text-slate-600 text-sm py-2 transition-colors"
            >
              סגור
            </button>
          </div>
        ) : (
          /* Floating Action Button */
          <button
            onClick={() => setIsExpanded(true)}
            className={`
              group flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300
              ${activeCall ? 'bg-slate-800 hover:bg-slate-900' : 'bg-green-500 hover:bg-green-600'}
            `}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium text-sm">
              {activeCall ? 'בשיחה' : 'טלפון'}
            </span>
          </button>
        )}
      </div>
    </>
  );
}
