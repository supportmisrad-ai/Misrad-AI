'use client';

import React, { useEffect } from 'react';

interface VoicecenterWidgetProps {
  /**
   * Voicenter Widget configuration
   * These will be provided by Nikita from Voicenter
   */
  config?: {
    apiKey?: string;
    extension?: string;
    serverUrl?: string;
  };
  
  /**
   * Organization slug for context
   */
  orgSlug: string;

  /**
   * Callback when a call is received
   */
  onIncomingCall?: (callerNumber: string) => void;
}

/**
 * VoicecenterWidget - WebRTC softphone widget
 * 
 * This component will embed Voicenter's WebRTC widget when they provide the integration details.
 * For now, it's a placeholder that shows where the widget will be mounted.
 * 
 * Expected integration steps:
 * 1. Voicenter provides widget script URL and initialization code
 * 2. We load the script dynamically
 * 3. We initialize the widget with org-specific credentials
 * 4. Widget handles incoming/outgoing calls directly in browser
 */
export default function VoicecenterWidget({ config, orgSlug, onIncomingCall }: VoicecenterWidgetProps) {
  useEffect(() => {
    // When Voicenter provides the widget, we'll load it here
    // Example (pseudocode):
    // const script = document.createElement('script');
    // script.src = 'https://widget.voicenter.com/webrtc.js';
    // script.onload = () => {
    //   window.VoicecenterWidget.init({
    //     apiKey: config.apiKey,
    //     extension: config.extension,
    //     onIncomingCall: (caller) => {
    //       onIncomingCall?.(caller);
    //     }
    //   });
    // };
    // document.body.appendChild(script);

    if (!config?.apiKey) {
      console.log('[VoicecenterWidget] Waiting for configuration from Voicenter');
      return;
    }

    // Cleanup on unmount
    return () => {
      // window.VoicecenterWidget?.destroy();
    };
  }, [config, onIncomingCall]);

  if (!config?.apiKey) {
    return (
      <div className="fixed bottom-4 left-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 shadow-lg max-w-sm z-50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <span className="text-2xl">☎️</span>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-1">Voicenter Widget</div>
            <div className="text-sm text-slate-600 leading-relaxed">
              ממתין לפרטי אינטגרציה מ-Voicenter.
              <br />
              כשניקיטה יספק את פרטי ה-Widget, הוא יופיע כאן.
            </div>
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
    >
      {/* Widget will be injected here by Voicenter's script */}
    </div>
  );
}
