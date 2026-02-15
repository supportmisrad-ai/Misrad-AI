'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Meeting, Client, MeetingAnalysisResult } from '@/components/client-os-full/types';
import { MeetingResultDashboard } from './MeetingResultDashboard';
import { Video, UploadCloud, Mic, MicOff, Zap, Plus, ArrowRight, LayoutGrid, Users } from 'lucide-react';
import { createClinicSession, createClinicClient } from '@/app/actions/client-clinic';
import { useAuth } from '@clerk/nextjs';
import { createBrowserStorageClientWithClerk } from '@/lib/supabase-browser';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeletons';

interface MeetingsPageClientProps {
  initialMeetings: Meeting[];
  initialClients: Client[];
  userRole: string;
  orgId: string;
  currentClientId?: string;
}

const MeetingsPageClient: React.FC<MeetingsPageClientProps> = ({ 
  initialMeetings, 
  initialClients, 
  userRole, 
  orgId, 
  currentClientId 
}) => {
  const { getToken } = useAuth();
  const supabase = useMemo(() => {
    return createBrowserStorageClientWithClerk(async () => {
      try {
        return await getToken({ template: 'supabase' });
      } catch {
        return await getToken();
      }
    });
  }, [getToken]);

  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<'LIST' | 'PROCESSING' | 'RESULT' | 'LIVE' | 'ADD'>('LIST');
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [analysisResult, setAnalysisResult] = useState<MeetingAnalysisResult | undefined>(undefined);
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Selection state
  const [selectedClientId, setSelectedClientId] = useState<string>(currentClientId || '');
  const [meetingLocation, setMeetingLocation] = useState<'ZOOM' | 'FRONTAL' | 'PHONE'>('ZOOM');

  // Live API State
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

  // Add Meeting State
  const [newMeetingDate, setNewMeetingDate] = useState<string>('');
  const [newMeetingTitle, setNewMeetingTitle] = useState<string>('');
  const [newMeetingLocation, setNewMeetingLocation] = useState<'ZOOM' | 'FRONTAL' | 'PHONE'>('ZOOM');
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  // Add Client State
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  if (!mounted) {
    return null;
  }

  const startLiveSession = async () => {
      if (!liveCoachEnabled) {
        window.dispatchEvent(
          new CustomEvent('nexus-toast', {
            detail: { message: 'Live Coach מושבת לערב השקה (עובד רק דרך שרת).', type: 'info' },
          })
        );
        return;
      }

      try {
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
        window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg, type: 'error' } }));
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
          const transcript = String(liveTranscription || '').trim();
          if (!transcript) throw new Error('אין מספיק תמלול להפקת דוח');

          const res = await fetch('/api/client-os/meetings/analyze-transcript', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ orgId, transcript }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({} as Record<string, unknown>));
            throw new Error(err?.error || 'Failed to analyze');
          }
          const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          const nestedData = (json?.data && typeof json.data === 'object' ? json.data : {}) as Record<string, unknown>;
          const analysis = (json?.analysis || nestedData?.analysis) as MeetingAnalysisResult | undefined;
          if (!analysis) throw new Error('Missing analysis');

          setAnalysisResult(analysis);
          setActiveView('RESULT');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'שגיאה בהפקת דוח Live';
          window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg, type: 'error' } }));
          setActiveView('LIST');
        } finally {
          setIsLiveFinalizing(false);
        }
      })();
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
        window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'נא להזין שם לקוח', type: 'error' } }));
        return;
    }

    setIsCreatingClient(true);
    try {
        const res = await createClinicClient({
            orgId,
            fullName: newClientName,
            email: newClientEmail || null,
            phone: newClientPhone || null,
        });

        window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'לקוח נוצר בהצלחה', type: 'success' } }));
        setSelectedClientId(res.id);
        setIsAddingClient(false);
        setNewClientName('');
        setNewClientEmail('');
        setNewClientPhone('');
        router.refresh();
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'שגיאה ביצירת לקוח';
        window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg, type: 'error' } }));
    } finally {
        setIsCreatingClient(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const mime = file.type || '';
          const isAudio = mime.startsWith('audio/');
          const isVideo = mime.startsWith('video/');
          if (!isAudio && !isVideo) {
              window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'ניתן להעלות קבצי שמע/וידאו בלבד.', type: 'error' } }));
              e.target.value = '';
              return;
          }

          if (!orgId) {
              window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'חסר organizationId. התחבר מחדש.', type: 'error' } }));
              e.target.value = '';
              return;
          }

          const effectiveClientId = selectedClientId || initialClients?.[0]?.id;
          if (!effectiveClientId) {
              window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'בחר לקוח לפני העלאה.', type: 'error' } }));
              e.target.value = '';
              return;
          }

          setProcessingFileName(file.name);
          setActiveView('PROCESSING');

          void (async () => {
              try {
                  if (!supabase) {
                      throw new Error('Supabase לא מוגדר בפרויקט.');
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
                      }),
                  });

                  if (!res.ok) {
                      const err = await res.json().catch(() => ({} as Record<string, unknown>));
                      throw new Error(err?.error || 'Processing failed');
                  }

                  const json = (await res.json()) as { analysis?: MeetingAnalysisResult };
                  if (!json.analysis) throw new Error('Missing analysis');
                  setAnalysisResult(json.analysis);
                  setActiveView('RESULT');
                  window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'הקלטה נותחה ונשמרה בהצלחה.', type: 'success' } }));
              } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'שגיאה בניתוח ההקלטה';
                  window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg, type: 'error' } }));
                  setActiveView('LIST');
              } finally {
                  setProcessingFileName(null);
                  e.target.value = '';
              }
          })();
      }
  };

  const handleAddMeeting = async () => {
    if (!selectedClientId) {
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'נא לבחור לקוח', type: 'error' } }));
      return;
    }
    if (!newMeetingTitle || !newMeetingDate) {
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'חסרים פרטים (כותרת/תאריך)', type: 'error' } }));
      return;
    }

    setIsAdding(true);
    try {
      await createClinicSession({
        orgId,
        clientId: selectedClientId,
        sessionType: newMeetingTitle, 
        startAt: new Date(newMeetingDate).toISOString(),
        location: newMeetingLocation,
        status: 'scheduled'
      });

      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'פגישה נוצרה בהצלחה', type: 'success' } }));
      setActiveView('LIST');
      router.refresh(); 
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'שגיאה ביצירת פגישה';
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg, type: 'error' } }));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col animate-fade-in p-8 md:p-12">
      {activeView !== 'RESULT' && activeView !== 'LIVE' && activeView !== 'ADD' && (
          <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-primary font-bold text-sm tracking-widest uppercase">
                  <Video size={16} />
                  <span>Intelligence Module</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">פגישות וניתוח שיחות</h1>
              <p className="text-slate-500 text-lg font-medium">נהל את הקשר עם הלקוחות בעזרת בינה מלאכותית.</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                  onClick={() => setActiveView('ADD')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                  <Plus size={20} /> הוסף פגישה ידנית
              </button>
              <button 
                  onClick={startLiveSession}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-nexus-gradient text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98] shadow-lg shadow-primary/10"
              >
                  <Mic size={20} /> התחל שיחה חיה
              </button>
            </div>
          </header>
      )}

      <div className="flex-1">
          
          {activeView === 'ADD' && (
             <div className="max-w-2xl mx-auto ui-card p-10 bg-white shadow-luxury">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                        <Plus size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">פגישה חדשה</h2>
                        <p className="text-slate-500 font-medium">תזמן פגישה או תעד שיחה שהתקיימה</p>
                    </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">בחירת לקוח</label>
                        <div className="flex gap-2">
                            <select 
                            className="flex-1 bg-slate-50 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                            <option value="">בחר לקוח מתוך הרשימה...</option>
                            {initialClients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                            </select>
                            <button
                                onClick={() => setIsAddingClient(!isAddingClient)}
                                className={`p-4 rounded-2xl transition-all border ${isAddingClient ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border-slate-200 hover:border-primary hover:text-primary'}`}
                                title="הוסף לקוח חדש"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">מיקום / סוג</label>
                        <select 
                        className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                        value={newMeetingLocation}
                        onChange={(e) => setNewMeetingLocation(e.target.value as 'ZOOM' | 'FRONTAL' | 'PHONE')}
                        >
                        <option value="ZOOM">שיחת ZOOM / וידאו</option>
                        <option value="FRONTAL">פגישה פרונטלית</option>
                        <option value="PHONE">שיחה טלפונית</option>
                        </select>
                    </div>
                  </div>

                  {isAddingClient && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary/5 border border-primary/10 rounded-3xl p-6 space-y-4 shadow-inner"
                      >
                          <div className="flex items-center gap-2 mb-2">
                              <Users size={16} className="text-primary" />
                              <h3 className="text-sm font-black text-primary uppercase tracking-widest">רישום לקוח מהיר</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input 
                                type="text" 
                                className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold"
                                placeholder="שם מלא *"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                            />
                            <input 
                                type="email" 
                                className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold"
                                placeholder="כתובת אימייל"
                                value={newClientEmail}
                                onChange={(e) => setNewClientEmail(e.target.value)}
                            />
                            <input 
                                type="tel" 
                                className="bg-white border-slate-200 rounded-xl p-3 text-sm font-bold"
                                placeholder="טלפון"
                                value={newClientPhone}
                                onChange={(e) => setNewClientPhone(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                              <button 
                                  onClick={() => setIsAddingClient(false)}
                                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-4 py-2"
                              >
                                  ביטול
                              </button>
                              <button 
                                  onClick={handleAddClient}
                                  disabled={isCreatingClient}
                                  className="bg-primary text-white text-xs px-6 py-2.5 rounded-xl font-bold hover:bg-primary-glow flex items-center gap-2 shadow-lg shadow-primary/20"
                              >
                                  {isCreatingClient && <Skeleton className="w-3 h-3 rounded-full bg-white/30" />}
                                  צור לקוח
                              </button>
                          </div>
                      </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">נושא הפגישה</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      value={newMeetingTitle}
                      onChange={(e) => setNewMeetingTitle(e.target.value)}
                      placeholder="למשל: שיחת אסטרטגיה חודשית..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">מועד וזמן</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 font-bold focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      value={newMeetingDate}
                      onChange={(e) => setNewMeetingDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-4 pt-6">
                    <button 
                      onClick={handleAddMeeting}
                      disabled={isAdding}
                      className="flex-[2] bg-nexus-gradient text-white py-5 rounded-[2rem] font-black text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all flex justify-center items-center gap-3 active:scale-[0.98]"
                    >
                      {isAdding && <Skeleton className="w-6 h-6 rounded-full bg-white/30" />}
                      שמור פגישה במערכת
                    </button>
                    <button 
                      onClick={() => setActiveView('LIST')}
                      className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[2rem] font-bold hover:bg-slate-200 transition-all active:scale-[0.98]"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
             </div>
          )}

          {activeView === 'LIVE' && liveCoachEnabled && (
              <div className="h-full flex flex-col gap-8 animate-in zoom-in-95 duration-500">
                  <div className="bg-nexus-primary rounded-[3rem] p-12 text-white relative overflow-hidden shadow-luxury">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
                      
                      <div className="relative z-10 flex flex-col items-center text-center gap-8">
                          <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
                              <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-20"></div>
                              <div className="absolute inset-[-8px] rounded-full border border-white/10"></div>
                              <Mic size={48} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                          </div>
                          <div className="space-y-2">
                              <h2 className="text-4xl font-black tracking-tight">Nexus Live Coach</h2>
                              <p className="text-slate-400 text-lg max-w-md mx-auto">מערכת ה-AI מאזינה ומנתחת את השיחה בזמן אמת כדי לספק תובנות והתראות.</p>
                          </div>
                          <button onClick={stopLiveSession} disabled={isLiveFinalizing} className="bg-red-500 hover:bg-red-600 px-12 py-4 rounded-2xl font-black text-lg transition-all flex items-center gap-3 shadow-xl shadow-red-500/20 active:scale-[0.95] disabled:opacity-50">
                              <MicOff size={22} /> סיים שיחה והפק דוח
                          </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                      <div className="ui-card p-8 bg-white flex flex-col h-[400px]">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                תמלול חי
                            </h3>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">LIVE STREAM</span>
                          </div>
                          <div className="flex-1 overflow-y-auto text-slate-800 text-lg leading-relaxed italic custom-scrollbar">
                              {liveTranscription || 'ממתין לקול...'}
                          </div>
                      </div>
                      <div className="space-y-6">
                        <div className="ui-card p-8 bg-nexus-gradient text-white flex flex-col gap-6">
                            <div className="flex items-center gap-3 text-white/80 font-black uppercase text-xs tracking-widest">
                                <Zap size={18} className="text-[color:var(--os-accent)]" />
                                <span>תובנות AI בזמן אמת</span>
                            </div>
                            <div className="p-6 bg-black/20 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-inner min-h-[150px] flex items-center justify-center text-center">
                                <p className="text-lg font-bold leading-relaxed">{liveInsight}</p>
                            </div>
                            <div className="space-y-2">
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                    <motion.div className="h-full bg-[color:var(--os-accent)]" animate={{ width: ['0%', '100%'] }} transition={{ duration: 5, repeat: Infinity }} />
                                </div>
                                <p className="text-[10px] text-white/40 text-center uppercase tracking-widest font-black">מנתח סנטימנט לקוח</p>
                            </div>
                        </div>
                      </div>
                  </div>
              </div>
          )}

          {activeView === 'LIVE' && !liveCoachEnabled && (
            <div className="ui-card p-10 bg-white text-center">
              <p className="text-slate-600 font-bold">Live Coach מושבת כרגע.</p>
              <button
                onClick={() => setActiveView('LIST')}
                className="mt-6 px-6 py-3 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              >
                חזור
              </button>
            </div>
          )}

          {activeView === 'PROCESSING' && (
              <div className="h-full flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
                  <div className="w-full max-w-3xl ui-card p-16 bg-white text-center space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-2 bg-slate-100 overflow-hidden">
                          <motion.div 
                            className="h-full bg-primary"
                            animate={{ left: ['-100%', '100%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          />
                      </div>
                      <div className="mx-auto w-24 h-24 rounded-[2rem] bg-primary/5 flex items-center justify-center mb-5 border border-primary/10">
                          <Skeleton className="w-12 h-12 rounded-full bg-primary/10" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tight">מנתח את ההקלטה</h3>
                        <p className="text-slate-500 text-xl font-medium">{processingFileName ?? 'הקובץ נטען'} </p>
                      </div>
                      <div className="max-w-md mx-auto p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-sm font-bold leading-relaxed italic">
                        "הבינה המלאכותית מחלצת כעת משימות, מזהה התנגדויות ומסכמת את עיקרי הפגישה עבורך."
                      </div>
                      <div className="pt-4 flex items-center justify-center gap-4">
                          <button
                              onClick={() => {
                                  setProcessingFileName(null);
                                  setActiveView('LIST');
                              }}
                              className="px-10 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-all"
                          >
                              ביטול תהליך
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {activeView === 'LIST' && (
              <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="lg:col-span-2 ui-card p-6 flex flex-col justify-center bg-white">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">סינון לפי לקוח</label>
                          <select
                              className="w-full bg-slate-50 border-transparent rounded-2xl p-4 font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none border border-slate-100"
                              value={selectedClientId}
                              onChange={(e) => setSelectedClientId(e.target.value)}
                          >
                              <option value="">כל הלקוחות (הצג הכל)</option>
                              {initialClients.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                      </div>
                      <div className="lg:col-span-1 ui-card p-6 flex flex-col justify-center bg-white">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">סוג פגישה</label>
                          <select
                              className="w-full bg-slate-50 border-transparent rounded-2xl p-4 font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none border border-slate-100"
                              value={meetingLocation}
                              onChange={(e) => setMeetingLocation(e.target.value as 'ZOOM' | 'FRONTAL' | 'PHONE')}
                          >
                              <option value="ZOOM">ZOOM / וידאו</option>
                              <option value="FRONTAL">פרונטלי</option>
                              <option value="PHONE">טלפון</option>
                          </select>
                      </div>
                      <div className="lg:col-span-1 bg-primary rounded-[2rem] p-6 flex flex-col justify-center text-white shadow-lg shadow-primary/20 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-default">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                              <Video size={80} />
                          </div>
                          <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">סה"כ פגישות</p>
                            <p className="text-4xl font-black">{meetings.length}</p>
                          </div>
                      </div>
                  </div>

                  <div className="relative group">
                    <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" title="גרור או לחץ להעלאת הקלטה" />
                    <div className="relative border-4 border-dashed border-slate-200 rounded-[3rem] p-16 text-center bg-white/50 hover:bg-white hover:border-primary/30 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/5">
                        <div className="w-24 h-24 bg-primary/5 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <UploadCloud size={48} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-3">העלאת הקלטה חדשה</h3>
                        <p className="text-slate-500 text-lg font-medium max-w-md mx-auto">גרור לכאן קבצי MP3, WAV או MP4. נקסוס ינתח את השיחה ויפיק תובנות באופן אוטומטי.</p>
                        <div className="mt-8 flex justify-center gap-3">
                            <span className="px-4 py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-full uppercase tracking-widest border border-slate-200">Audio Only</span>
                            <span className="px-4 py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-full uppercase tracking-widest border border-slate-200">Video Sync</span>
                        </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                            <LayoutGrid size={20} className="text-primary" />
                            פגישות אחרונות
                        </h3>
                        <button className="text-sm font-bold text-primary hover:underline">הצג את כל ההיסטוריה</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {meetings.length === 0 && (
                            <div className="col-span-full py-20 text-center ui-card bg-white/50 border-dashed border-2">
                                <Video size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold text-xl">אין עדיין פגישות מתועדות במערכת</p>
                                <button onClick={() => setActiveView('ADD')} className="mt-4 text-primary font-black uppercase tracking-widest text-sm hover:underline">צור פגישה ראשונה</button>
                            </div>
                        )}
                        {meetings.map(m => (
                            <motion.div 
                                key={m.id} 
                                whileHover={{ y: -8 }}
                                onClick={() => { 
                                    if(m.aiAnalysis) {
                                        setAnalysisResult(m.aiAnalysis); 
                                        setActiveView('RESULT'); 
                                    } else {
                                        window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'לפגישה זו אין עדיין ניתוח AI', type: 'info' } }));
                                    }
                                }} 
                                className="ui-card p-8 bg-white cursor-pointer group relative overflow-hidden flex flex-col h-full"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-4 rounded-2xl transition-all duration-500 ${m.location === 'ZOOM' ? 'bg-blue-50 text-blue-600' : m.location === 'FRONTAL' ? 'bg-emerald-50 text-emerald-600' : 'bg-[color:var(--os-accent)]/10 text-[color:var(--os-accent)]'}`}>
                                        <Video size={24} />
                                    </div>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{m.date}</span>
                                </div>
                                
                                <div className="space-y-3 flex-1">
                                    <h4 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{m.title}</h4>
                                    <p className="text-slate-500 font-medium leading-relaxed line-clamp-3">{m.summary || 'אין סיכום פגישה זמין כרגע. העלה הקלטה או הוסף סיכום ידני.'}</p>
                                </div>
                                
                                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex -space-x-2 rtl:space-x-reverse">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">A</div>
                                        <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary">AI</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <span>צפה בניתוח</span>
                                        <ArrowRight size={14} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                  </div>
              </div>
          )}

          {activeView === 'RESULT' && analysisResult && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <MeetingResultDashboard 
                    analysisResult={analysisResult} 
                    fileName="שיחה מנותחת" 
                    onBack={() => setActiveView('LIST')} 
                    activeAutomations={[]} 
                    onToggleAutomation={() => {}} 
                />
              </div>
          )}
      </div>
    </div>
  );
};

export default MeetingsPageClient;
