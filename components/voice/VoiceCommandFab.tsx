'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Mic, Square, X, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

function inferOrgSlugFromPathname(pathname: string): string | null {
  const match = String(pathname || '').match(/^\/w\/([^/]+)(?:\/.*)?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

type VoiceCommandResponse = {
  ok: boolean;
  transcript?: string;
  action?: string;
  command?: any;
  message: string;
  error?: string;
  actionResult?: any;
};

export function triggerVoiceCommandOverlay() {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('nexus:open-voice-command'));
  } catch {
    // ignore
  }
}

export function VoiceCommandFab() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { addToast } = useToast();
  const orgSlug = useMemo(() => inferOrgSlugFromPathname(pathname), [pathname]);

  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setIsOpen(true);
    };

    window.addEventListener('nexus:open-voice-command', handler as any);
    return () => {
      window.removeEventListener('nexus:open-voice-command', handler as any);
    };
  }, []);

  const speak = useCallback((text: string) => {
    try {
      if (typeof window === 'undefined') return;
      if (!('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'he-IL';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  }, []);

  const cleanupStream = useCallback(() => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (isProcessing) return;
    setMessage('');
    setTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        cleanupStream();
        await submitRecording(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (e: any) {
      cleanupStream();
      setMessage(e?.message ? `שגיאה בגישה למיקרופון: ${e.message}` : 'שגיאה בגישה למיקרופון');
    }
  }, [cleanupStream, isProcessing]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (!isRecording) return;
    try {
      mediaRecorderRef.current.stop();
    } catch {
      // ignore
    }
    setIsRecording(false);
  }, [isRecording]);

  const submitRecording = useCallback(
    async (blob: Blob) => {
      if (!orgSlug) {
        setMessage('כדי להשתמש בפקודות קוליות צריך להיות בתוך Workspace (/w/...).');
        return;
      }

      setIsProcessing(true);
      setMessage('מפענח…');

      try {
        const file = new File([blob], 'voice.webm', { type: blob.type || 'audio/webm' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('orgSlug', orgSlug);
        formData.append('pathname', pathname);

        const res = await fetch('/api/voice/command', {
          method: 'POST',
          body: formData,
        });

        const json = (await res.json().catch(() => null)) as VoiceCommandResponse | null;
        if (!res.ok || !json) {
          const errMsg = json?.message || json?.error || `שגיאה (${res.status})`;
          setMessage(String(errMsg));
          return;
        }

        setTranscript(String(json.transcript || ''));
        setMessage(String(json.message || 'בוצע.'));

        const action = String(json.action || json.command?.action || '');
        const url = json.actionResult?.url ? String(json.actionResult.url) : '';

        speak(String(json.message || 'בוצע.'));

        if (action === 'navigate' && url) {
          addToast(`מנווט ל-${url}...`, 'success');
          setTimeout(() => {
            try {
              router.push(url);
            } catch {
              // ignore
            }
          }, 0);
        }
      } catch (e: any) {
        setMessage(e?.message ? `שגיאה: ${e.message}` : 'שגיאה בשליחה לשרת');
      } finally {
        setIsProcessing(false);
      }
    },
    [addToast, orgSlug, pathname, router, speak]
  );

  const close = useCallback(() => {
    if (isProcessing) return;
    if (isRecording) stopRecording();
    cleanupStream();
    setIsOpen(false);
  }, [cleanupStream, isProcessing, isRecording, stopRecording]);

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-[470] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="font-black text-slate-900">פקודה קולית</div>
              <button type="button" onClick={close} className="p-2 rounded-xl hover:bg-slate-100" aria-label="סגור">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-center">
                {isProcessing ? (
                  <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center">
                    <Loader2 className="animate-spin" size={28} />
                  </div>
                ) : isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-24 h-24 rounded-full bg-red-600 text-white shadow-xl flex items-center justify-center"
                    aria-label="סיים הקלטה"
                  >
                    <Square size={30} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-24 h-24 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center"
                    aria-label="התחל הקלטה"
                  >
                    <Mic size={30} />
                  </button>
                )}
              </div>

              <div className="mt-4 text-center text-sm font-bold text-slate-600">
                {isProcessing ? 'שולח לשרת ומבצע…' : isRecording ? 'מדבר/ת… לחץ לסיום' : 'לחץ והתחל לדבר'}
              </div>

              {message ? (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <Sparkles size={16} />
                    תוצאה
                  </div>
                  <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{message}</div>
                  {transcript ? (
                    <div className="mt-3 text-xs text-slate-500 whitespace-pre-wrap">תמלול: {transcript}</div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={close}
                className="w-full rounded-2xl bg-slate-900 text-white py-3 font-black hover:bg-slate-800 transition-colors disabled:opacity-60"
                disabled={isProcessing}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
