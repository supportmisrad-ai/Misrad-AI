import React, { useState, useEffect, useRef } from 'react';
import { analyzeMeetingTranscript } from '../services/geminiService'; 
// Fix: Removed Modality from local types import as it should come from the GenAI SDK
import { MeetingAnalysisResult } from '../types';
import { BrainCircuit, UploadCloud, Video, UserPlus, Trash2, ArrowRight, X, Check, UserCircle, Mic, MicOff, Zap } from 'lucide-react';
import { MeetingResultDashboard } from './meeting/MeetingResultDashboard';
import { useNexus } from '../context/ClientContext';
import { supabase } from '@/lib/supabase-client';
import { Skeleton } from '@/components/ui/skeletons';

const MeetingIntelligence: React.FC = () => {
  const { clients, meetings: contextMeetings } = useNexus();
  const [activeView, setActiveView] = useState<'LIST' | 'PROCESSING' | 'RESULT' | 'LIVE'>('LIST');
  const [meetings, setMeetings] = useState(contextMeetings);
  const [analysisResult, setAnalysisResult] = useState<MeetingAnalysisResult | undefined>(contextMeetings[0]?.aiAnalysis);
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [meetingLocation, setMeetingLocation] = useState<'ZOOM' | 'FRONTAL' | 'PHONE'>('ZOOM');
  
  // Live API State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [liveInsight, setLiveInsight] = useState('ממתין לתחילת השיחה...');
  const sessionRef = useRef<any>(null);

  const orgId = (typeof window !== 'undefined'
    ? ((window as any).__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined)?.organizationId
    : null) ?? null;

  // Sync meetings from context
  useEffect(() => {
    setMeetings(contextMeetings);
  }, [contextMeetings]);

  const startLiveSession = async () => {
      window.dispatchEvent(
        new CustomEvent('nexus-toast', {
          detail: { message: 'Live Coach מושבת לערב השקה (עובד רק דרך שרת).', type: 'info' },
        })
      );
  };

  const stopLiveSession = () => {
      setIsLiveActive(false);
      setActiveView('LIST');
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

          const effectiveClientId = selectedClientId || clients?.[0]?.id;
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
                      }),
                  });

                  if (!uploadUrlRes.ok) {
                      const err = await uploadUrlRes.json().catch(() => ({} as any));
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
                      const err = await res.json().catch(() => ({} as any));
                      throw new Error(err?.error || 'Processing failed');
                  }

                  const json = (await res.json()) as { analysis?: MeetingAnalysisResult };
                  if (!json.analysis) throw new Error('Missing analysis');
                  setAnalysisResult(json.analysis);
                  setActiveView('RESULT');
                  window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'הקלטה נותחה ונשמרה בהצלחה.', type: 'success' } }));
              } catch (err: any) {
                  window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: err?.message || 'שגיאה בניתוח ההקלטה', type: 'error' } }));
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
      {activeView !== 'RESULT' && activeView !== 'LIVE' && (
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
                          <button onClick={stopLiveSession} className="bg-red-500 hover:bg-red-600 px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
                              <MicOff size={18} /> סיים שיחה
                          </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                      <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col">
                          <h3 className="font-bold text-gray-400 uppercase text-xs mb-4">תמלול חי</h3>
                          <div className="flex-1 overflow-y-auto text-gray-800 leading-relaxed italic">
                              {liveTranscription || 'התחל לדבר...'}
                          </div>
                      </div>
                      <div className="bg-nexus-bg border rounded-2xl p-6 flex flex-col gap-4">
                          <div className="flex items-center gap-2 text-nexus-accent font-bold"><Zap size={18} /> תובנות בזמן אמת</div>
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
                      <h3 className="text-2xl font-bold text-gray-900">מנתח את ההקלטה...</h3>
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
                          <select
                              className="w-full bg-transparent border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-nexus-primary"
                              value={selectedClientId}
                              onChange={(e) => setSelectedClientId(e.target.value)}
                          >
                              <option value="">(ברירת מחדל: לקוח ראשון)</option>
                              {clients.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                      </div>
                      <div className="bg-white border border-slate-200/70 rounded-2xl p-4">
                          <div className="text-gray-400 uppercase text-[10px] font-bold mb-2">סוג פגישה</div>
                          <select
                              className="w-full bg-transparent border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-nexus-primary"
                              value={meetingLocation}
                              onChange={(e) => setMeetingLocation(e.target.value as any)}
                          >
                              <option value="ZOOM">ZOOM</option>
                              <option value="FRONTAL">FRONTAL</option>
                              <option value="PHONE">PHONE</option>
                          </select>
                      </div>
                  </div>
                  <div className="relative border-2 border-dashed border-slate-200/70 rounded-3xl p-12 text-center bg-white hover:border-nexus-primary transition-all cursor-pointer">
                      <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <UploadCloud size={48} className="mx-auto text-nexus-primary mb-4" />
                      <h3 className="text-xl font-bold">העלאת הקלטה קיימת</h3>
                      <p className="text-gray-500 mt-2">MP3, WAV, MP4 • נקסוס ינתח הכל תוך דקות</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {meetings.map(m => (
                          <div key={m.id} onClick={() => { setAnalysisResult(m.aiAnalysis); setActiveView('RESULT'); }} className="glass-card p-5 rounded-xl border cursor-pointer hover:shadow-lg transition-all">
                              <div className="flex justify-between mb-4">
                                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Video size={20} /></div>
                                  <span className="text-xs text-gray-400">{m.date}</span>
                              </div>
                              <h4 className="font-bold text-gray-900 mb-1">{m.title}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2">{m.summary}</p>
                          </div>
                      ))}
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