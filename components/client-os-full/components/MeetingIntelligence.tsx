'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
// Fix: Removed Modality from local types import as it should come from the GenAI SDK
import { MeetingAnalysisResult } from '../types';
import { UploadCloud, Video, Mic, MicOff, Zap, FileText, ArrowLeft } from 'lucide-react';
import { MeetingResultDashboard } from './meeting/MeetingResultDashboard';
import { useNexus } from '../context/ClientContext';
import { CustomSelect } from '@/components/CustomSelect';

import { useAuth } from '@clerk/nextjs';
import { createBrowserStorageClientWithClerk } from '@/lib/supabase-browser';
import { Skeleton } from '@/components/ui/skeletons';

const MeetingIntelligence: React.FC = () => {
  const { clients, meetings: contextMeetings } = useNexus();
  const { getToken } = useAuth();
  const [activeView, setActiveView] = useState<'LIST' | 'PROCESSING' | 'RESULT' | 'LIVE' | 'TRANSCRIPT'>('LIST');
  const [uploadMode, setUploadMode] = useState<'analyze' | 'transcribe'>('analyze');
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null);
  const [meetings, setMeetings] = useState(contextMeetings);
  const [analysisResult, setAnalysisResult] = useState<MeetingAnalysisResult | undefined>(contextMeetings[0]?.aiAnalysis);
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [meetingLocation, setMeetingLocation] = useState<'ZOOM' | 'FRONTAL' | 'PHONE'>('ZOOM');

  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [liveInsight, setLiveInsight] = useState('ממתין לתחילת השיחה...');
  const [isLiveFinalizing, setIsLiveFinalizing] = useState(false);

  const liveCoachEnabled = process.env.NEXT_PUBLIC_LIVE_COACH_ENABLED === 'true';

  const liveRecorderRef = useRef<MediaRecorder | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveTranscribeInFlightRef = useRef(false);
  const liveInsightInFlightRef = useRef(false);
  const lastInsightAtRef = useRef(0);
  const lastInsightTranscriptLenRef = useRef(0);

  const supabase = useMemo(() => {
    return createBrowserStorageClientWithClerk(async () => {
      try {
        return await getToken({ template: 'supabase' });
      } catch {
        return await getToken();
      }
    });
  }, [getToken]);

  const orgId = (typeof globalThis !== 'undefined'
    ? ((globalThis as unknown as Record<string, unknown>).__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined)?.organizationId
    : null) ?? null;

  // Sync meetings from context
  useEffect(() => {
    setMeetings(contextMeetings);
  }, [contextMeetings]);

  const startLiveSession = async () => {
    if (!liveCoachEnabled) {
      globalThis.dispatchEvent(
        new CustomEvent('nexus-toast', {
          detail: { message: 'Live Coach מושבת לערב השקה (עובד רק דרך שרת).', type: 'info' },
        })
      );
      return;
    }

    try {
      if (!orgId) {
        globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'חסר organizationId. התחבר מחדש.', type: 'error' } }));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;

      let recorder: MediaRecorder;
      const preferred = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(preferred)) {
        recorder = new MediaRecorder(stream, { mimeType: preferred });
      } else {
        recorder = new MediaRecorder(stream);
      }
      liveRecorderRef.current = recorder;

      lastInsightAtRef.current = 0;
      lastInsightTranscriptLenRef.current = 0;
      setIsLiveActive(true);
      setIsLiveFinalizing(false);
      setLiveTranscription('');
      setLiveInsight('ממתין לתחילת השיחה...');
      setActiveView('LIVE');

      recorder.ondataavailable = async (ev: BlobEvent) => {
        try {
          if (!ev.data || ev.data.size === 0) return;
          if (liveTranscribeInFlightRef.current) return;
          liveTranscribeInFlightRef.current = true;

          const mimeType = recorder.mimeType || ev.data.type || 'audio/webm';
          const form = new FormData();
          form.append('orgId', String(orgId));
          form.append('mimeType', mimeType);
          form.append('audio', new File([ev.data], `live-${Date.now()}.webm`, { type: mimeType }));

          const res = await fetch('/api/client-os/meetings/live/transcribe', {
            method: 'POST',
            body: form,
          });

          if (!res.ok) return;
          const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          const nested = (data?.data && typeof data.data === 'object' ? data.data : {}) as Record<string, unknown>;
          const text = String(data?.text || nested?.text || '').trim();
          if (!text) return;

          let nextTranscript = '';
          setLiveTranscription((prev) => {
            nextTranscript = prev ? `${prev}\n${text}` : text;
            return nextTranscript;
          });

          const now = Date.now();
          const minMs = 6500;
          const minCharsDelta = 220;

          if (
            !liveInsightInFlightRef.current &&
            now - lastInsightAtRef.current >= minMs &&
            nextTranscript.length - lastInsightTranscriptLenRef.current >= minCharsDelta
          ) {
            liveInsightInFlightRef.current = true;
            lastInsightAtRef.current = now;
            lastInsightTranscriptLenRef.current = nextTranscript.length;

            void (async () => {
              try {
                const insightRes = await fetch('/api/client-os/meetings/live/insight', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ orgId, transcript: nextTranscript }),
                });
                if (!insightRes.ok) return;
                const insightJson = (await insightRes.json().catch(() => ({}))) as Record<string, unknown>;
                const nestedInsight = (insightJson?.data && typeof insightJson.data === 'object' ? insightJson.data : {}) as Record<string, unknown>;
                const insight = String(insightJson?.insight || nestedInsight?.insight || '').trim();
                if (insight) setLiveInsight(insight);
              } finally {
                liveInsightInFlightRef.current = false;
              }
            })();
          }
        } finally {
          liveTranscribeInFlightRef.current = false;
        }
      };

      recorder.start(2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה בהפעלת Live';
      globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg, type: 'error' } }));
      setIsLiveActive(false);
      setActiveView('LIST');
    }
  };

  const stopLiveSession = () => {
    try {
      setIsLiveActive(false);
      setIsLiveFinalizing(true);
      setLiveInsight('מפיק דוח...');

      const rec = liveRecorderRef.current;
      if (rec && rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }

      const stream = liveStreamRef.current;
      if (stream) {
        for (const t of stream.getTracks()) {
          try {
            t.stop();
          } catch {
            // ignore
          }
        }
      }
    } finally {
      liveRecorderRef.current = null;
      liveStreamRef.current = null;
    }

    void (async () => {
      try {
        if (!orgId) throw new Error('Missing orgId');
        const transcript = String(liveTranscription || '').trim();
        if (!transcript) throw new Error('אין מספיק תמלול להפקת דוח');

        const res = await fetch('/api/client-os/meetings/analyze-transcript', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orgId, transcript }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({} as Record<string, unknown>));
          throw new Error(String(err?.error || 'Failed to analyze'));
        }
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const nestedData = (json?.data && typeof json.data === 'object' ? json.data : {}) as Record<string, unknown>;
        const analysis = (json?.analysis || nestedData?.analysis) as MeetingAnalysisResult | undefined;
        if (!analysis) throw new Error('Missing analysis');

        setAnalysisResult(analysis);
        setActiveView('RESULT');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'שגיאה בהפקת דוח Live';
        globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg, type: 'error' } }));
        setActiveView('LIST');
      } finally {
        setIsLiveFinalizing(false);
      }
    })();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mime = file.type || '';
      const isAudio = mime.startsWith('audio/');
      const isVideo = mime.startsWith('video/');
      if (!isAudio && !isVideo) {
        globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'ניתן להעלות קבצי שמע/וידאו בלבד.', type: 'error' } }));
        e.target.value = '';
        return;
      }

      if (!orgId) {
        globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'חסר organizationId. התחבר מחדש.', type: 'error' } }));
        e.target.value = '';
        return;
      }

      const effectiveClientId = selectedClientId || clients?.[0]?.id;
      if (!effectiveClientId) {
        globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'בחר לקוח לפני העלאה.', type: 'error' } }));
        e.target.value = '';
        return;
      }

      setProcessingFileName(file.name);
      setActiveView('PROCESSING');

      void (async () => {
        try {
          if (!supabase) {
            throw new Error('Supabase לא מוגדר בפרויקט (חסרים NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).');
          }

          const uploadUrlRes = await fetch('/api/client-os/meetings/upload-url', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              orgId,
              clientId: effectiveClientId,
              fileName: file.name,
              mimeType: file.type || '',
              fileSize: file.size,
            }),
          });

          if (!uploadUrlRes.ok) {
            const err = await uploadUrlRes.json().catch(() => ({} as Record<string, unknown>));
            throw new Error(err?.error || 'Failed to get upload URL');
          }

          const uploadUrlJson = (await uploadUrlRes.json()) as {
            bucket: string;
            path: string;
            signedUrl: string;
            token: string;
          };

          const uploadResult = await supabase.storage
            .from(uploadUrlJson.bucket)
            .uploadToSignedUrl(uploadUrlJson.path, uploadUrlJson.token, file, {
              contentType: file.type || 'application/octet-stream',
            });

          if (uploadResult.error) {
            throw new Error(uploadResult.error.message || 'Upload to Storage failed');
          }

          const res = await fetch('/api/client-os/meetings/process', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              orgId,
              clientId: effectiveClientId,
              title: file.name,
              location: meetingLocation,
              bucket: uploadUrlJson.bucket,
              path: uploadUrlJson.path,
              mimeType: file.type || '',
              fileName: file.name,
              mode: uploadMode,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({} as Record<string, unknown>));
            throw new Error(err?.error || 'Processing failed');
          }

          const json = (await res.json()) as { analysis?: MeetingAnalysisResult; transcript?: string; mode?: string };

          if (json.mode === 'transcribe' || uploadMode === 'transcribe') {
            setTranscriptResult(json.transcript || '');
            setActiveView('TRANSCRIPT');
            globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'התמלול הושלם ונשמר בהצלחה.', type: 'success' } }));
          } else {
            if (!json.analysis) throw new Error('Missing analysis');
            setAnalysisResult(json.analysis);
            setActiveView('RESULT');
            globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'הקלטה נותחה ונשמרה בהצלחה.', type: 'success' } }));
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'שגיאה בניתוח ההקלטה';
          globalThis.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg, type: 'error' } }));
          setActiveView('LIST');
        } finally {
          setProcessingFileName(null);
          e.target.value = '';
        }
      })();
    }
  };

  useEffect(() => {
    const handleComplete = () => setActiveView('RESULT');
    window.addEventListener('nexus-processing-complete', handleComplete);
    return () => window.removeEventListener('nexus-processing-complete', handleComplete);
  }, []);

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {activeView !== 'RESULT' && activeView !== 'LIVE' && activeView !== 'TRANSCRIPT' && (
        <header className="mb-6 flex justify-end items-end pb-2">
          <button
            onClick={startLiveSession}
            className="flex items-center gap-2 px-6 py-3 bg-nexus-primary text-white rounded-xl font-bold hover:bg-nexus-accent transition-all shadow-lg"
            type="button"
          >
            <Mic size={18} /> התחל שיחה חיה
          </button>
        </header>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {activeView === 'LIVE' && (
          <div className="h-full flex flex-col gap-6 animate-fade-in">
            <div className="bg-nexus-primary rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10 flex flex-col items-center text-center gap-6">
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-4 border-nexus-accent animate-ping opacity-20"></div>
                  <Mic size={40} className="text-nexus-accent" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">Nexus Live Session</h2>
                  <p className="text-white/60">מאזין ומנתח בזמן אמת. אל תדאג, הכל מתועד.</p>
                </div>
                <button
                  onClick={stopLiveSession}
                  disabled={isLiveFinalizing}
                  className="bg-red-500 hover:bg-red-600 px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <MicOff size={18} /> סיים שיחה
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col">
                <h3 className="font-bold text-gray-400 uppercase text-xs mb-4">תמלול חי</h3>
                <div className="flex-1 overflow-y-auto text-gray-800 leading-relaxed italic">
                  {isLiveActive ? liveTranscription || 'התחל לדבר...' : 'השיחה הסתיימה.'}
                </div>
              </div>
              <div className="bg-nexus-bg border rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-nexus-accent font-bold">
                  <Zap size={18} /> תובנות בזמן אמת
                </div>
                <div className="p-4 bg-white rounded-xl border border-nexus-accent/30 shadow-sm text-sm font-medium">
                  {liveInsight}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'PROCESSING' && (
          <div className="h-full flex flex-col items-center justify-center gap-6 animate-fade-in">
            <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-10 shadow-sm text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-nexus-primary/10 flex items-center justify-center mb-5">
                <Skeleton className="w-10 h-10 rounded-xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {uploadMode === 'transcribe' ? 'מתמלל את ההקלטה...' : 'מנתח את ההקלטה...'}
              </h3>
              <p className="text-gray-500 mt-2">{processingFileName ?? 'הקובץ נטען'} </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setProcessingFileName(null);
                    setActiveView('LIST');
                  }}
                  className="px-6 py-3 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                >
                  חזור
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'LIST' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200/70 rounded-2xl p-4">
                <div className="text-gray-400 uppercase text-[10px] font-bold mb-2">לקוח</div>
                <CustomSelect
                  value={selectedClientId}
                  onChange={(val) => setSelectedClientId(val)}
                  placeholder="(ברירת מחדל: לקוח ראשון)"
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div className="bg-white border border-slate-200/70 rounded-2xl p-4">
                <div className="text-gray-400 uppercase text-[10px] font-bold mb-2">סוג פגישה</div>
                <CustomSelect
                  value={meetingLocation}
                  onChange={(val) => setMeetingLocation(val as 'ZOOM' | 'FRONTAL' | 'PHONE')}
                  options={[
                    { value: 'ZOOM', label: 'ZOOM' },
                    { value: 'FRONTAL', label: 'FRONTAL' },
                    { value: 'PHONE', label: 'PHONE' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => setUploadMode('analyze')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                  uploadMode === 'analyze'
                    ? 'bg-nexus-primary text-white border-nexus-primary shadow-lg'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-nexus-primary/30'
                }`}
              >
                <Zap size={14} /> ניתוח מלא + תמלול
              </button>
              <button
                onClick={() => setUploadMode('transcribe')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                  uploadMode === 'transcribe'
                    ? 'bg-nexus-primary text-white border-nexus-primary shadow-lg'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-nexus-primary/30'
                }`}
              >
                <FileText size={14} /> תמלול בלבד
              </button>
            </div>

            <div className="relative border-2 border-dashed border-slate-200/70 rounded-3xl p-12 text-center bg-white hover:border-nexus-primary transition-all cursor-pointer">
              <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <UploadCloud size={48} className="mx-auto text-nexus-primary mb-4" />
              <h3 className="text-xl font-bold">
                {uploadMode === 'transcribe' ? 'העלאת הקלטה לתמלול' : 'העלאת הקלטה לניתוח'}
              </h3>
              <p className="text-gray-500 mt-2">
                {uploadMode === 'transcribe'
                  ? 'MP3, WAV, MP4 • המערכת תתמלל את ההקלטה ותשמור אותה'
                  : 'MP3, WAV, MP4 • נקסוס ינתח הכל תוך דקות'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {meetings.map(m => (
                <div key={m.id} onClick={() => {
                  if (m.aiAnalysis) {
                    setAnalysisResult(m.aiAnalysis);
                    setActiveView('RESULT');
                  } else if (m.transcript) {
                    setTranscriptResult(m.transcript);
                    setActiveView('TRANSCRIPT');
                  }
                }} className="glass-card p-5 rounded-xl border cursor-pointer hover:shadow-lg transition-all">
                  <div className="flex justify-between mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Video size={20} /></div>
                    <span className="text-xs text-gray-400">{m.date}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{m.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{m.summary || (m.transcript ? 'תמלול בלבד' : '')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'TRANSCRIPT' && transcriptResult !== null && (
          <div className="animate-fade-in space-y-6">
            <button
              onClick={() => { setTranscriptResult(null); setActiveView('LIST'); }}
              className="flex items-center gap-2 text-gray-400 hover:text-nexus-primary transition-all font-bold text-sm"
            >
              <ArrowLeft size={16} /> חזרה לרשימה
            </button>
            <div className="bg-white border rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-nexus-primary/10 text-nexus-primary rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">תמלול הקלטה</h2>
                  <p className="text-gray-500 text-sm">התמלול הושלם ונשמר במערכת</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                <pre className="whitespace-pre-wrap text-gray-800 text-base leading-relaxed font-sans" dir="rtl">
                  {transcriptResult}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeView === 'RESULT' && analysisResult && (
          <MeetingResultDashboard analysisResult={analysisResult} fileName="שיחה מנותחת" onBack={() => setActiveView('LIST')} activeAutomations={[]} onToggleAutomation={() => {}} />
        )}
      </div>
    </div>
  );
};

export default MeetingIntelligence;