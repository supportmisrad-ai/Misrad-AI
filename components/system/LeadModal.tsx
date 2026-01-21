'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Lead, Activity, Task } from './types';
import { STAGES } from './constants';
import { 
    X, Phone, Mail, ArrowRight, MessageSquare, CalendarClock, Paperclip, Loader2
} from 'lucide-react';
import LogCallModal from './LogCallModal';
import { useToast } from './contexts/ToastContext';
import { createSystemLeadActivity } from '@/app/actions/system-leads';
import { uploadCallRecordingFile } from '@/app/actions/files';

interface LeadModalProps {
  lead: Lead;
  onClose: () => void;
  onAddActivity: (leadId: string, activity: Activity) => void;
  onScheduleMeeting: (leadId: string) => void;
  onStatusChange?: (id: string, status: any) => void; 
  onOpenClientPortal?: () => void;
  onAddTask?: (task: Task) => void;
  assignees?: Array<{ id: string; name: string; email: string | null; avatarUrl: string | null }>;
  onUpdateLead?: (params: {
    leadId: string;
    name?: string;
    phone?: string;
    email?: string | null;
    assignedAgentId?: string | null;
    nextActionDate?: Date | null;
    nextActionNote?: string | null;
  }) => void;
}

const LeadModal: React.FC<LeadModalProps> = ({
  lead,
  onClose,
  onAddActivity,
  onScheduleMeeting,
  onStatusChange,
  onOpenClientPortal,
  assignees,
  onUpdateLead,
}) => {
  const { addToast } = useToast();
  const pathname = usePathname();
  const [composerTab, setComposerTab] = useState<'note' | 'call' | 'task' | 'email'>('note');
  const [noteContent, setNoteContent] = useState('');
  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftAssignedAgentId, setDraftAssignedAgentId] = useState<string>('');

  const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const toLocalDateTimeInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [followUpInput, setFollowUpInput] = useState<string>('');
  const [followUpNote, setFollowUpNote] = useState<string>('');

  useEffect(() => {
    setDraftName(String(lead.name || ''));
    setDraftPhone(String((lead as any).phone || ''));
    setDraftEmail(String((lead as any).email || ''));
    setDraftAssignedAgentId(String(lead.assignedAgentId || ''));

    const d = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
    setFollowUpInput(d ? toLocalDateTimeInputValue(d) : '');
    setFollowUpNote(lead.nextActionNote != null ? String(lead.nextActionNote) : '');
  }, [lead.id]);

  const now = new Date();
  const followUpDate = followUpInput ? new Date(followUpInput) : (lead.nextActionDate ? new Date(lead.nextActionDate) : null);
  const followUpTone =
    followUpDate == null || Number.isNaN(followUpDate.getTime())
      ? 'none'
      : isSameLocalDay(followUpDate, now)
        ? 'today'
        : followUpDate.getTime() < now.getTime()
          ? 'overdue'
          : 'future';

  const handleSubmitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    
    const typeMap: Record<string, Activity['type']> = {
        'note': 'note', 'call': 'call', 'email': 'email', 'task': 'system'
    };

    const newActivity: Activity = {
      id: Date.now().toString(),
      type: typeMap[composerTab],
      content: noteContent,
      timestamp: new Date()
    };
    onAddActivity(lead.id, newActivity);
    setNoteContent('');
  };

  const stageLabel = STAGES.find((s) => s.id === lead.status)?.label || String(lead.status || '');

  const canOpenPortal = !!String((lead as any)?.email || '').trim();

  const handleSaveBasics = async (patch: {
    name?: string;
    phone?: string;
    email?: string | null;
    assignedAgentId?: string | null;
  }) => {
    if (!onUpdateLead) return;
    onUpdateLead({ leadId: lead.id, ...patch });
  };

  const handleSaveFollowUp = () => {
    if (!onUpdateLead) return;
    const d = followUpInput ? new Date(followUpInput) : null;
    onUpdateLead({
      leadId: lead.id,
      nextActionDate: d && !Number.isNaN(d.getTime()) ? d : null,
      nextActionNote: followUpNote.trim() ? followUpNote : null,
    });
  };

  const openTel = () => {
    const phone = String((lead as any)?.phone || '').trim();
    if (!phone) return;
    window.location.href = `tel:${phone}`;
    setIsLogCallOpen(true);
  };

  const openEmail = () => {
    const email = String((lead as any)?.email || '').trim();
    if (!email) return;
    window.open(`mailto:${encodeURIComponent(email)}`);
  };

  const openWhatsapp = () => {
    const phone = String((lead as any)?.phone || '').trim();
    const digits = phone.replace(/[^0-9]/g, '');
    if (!digits) return;
    window.open(`https://wa.me/${digits}`);
  };

  const orgSlugFromPathname = () => {
    const parts = String(pathname || '').split('/').filter(Boolean);
    const wIndex = parts.indexOf('w');
    if (wIndex === -1) return null;
    return parts[wIndex + 1] || null;
  };

  const handleUploadRecording = async (file: File) => {
    const orgSlug = orgSlugFromPathname();
    if (!orgSlug) {
      addToast('לא ניתן להעלות הקלטה (orgSlug חסר)', 'error');
      return;
    }

    setIsUploadingRecording(true);
    try {
      const uploadRes = await uploadCallRecordingFile(file, file.name, String(lead.id));
      if (!uploadRes.success) {
        addToast(uploadRes.error || 'שגיאה בהעלאת הקלטה', 'error');
        return;
      }

      const audioUrl = String(uploadRes.url || '').trim();
      const audioPath = String(uploadRes.path || '').trim();
      const audioBucket = String((uploadRes as any).bucket || '').trim();
      const audioSignedUrl = String((uploadRes as any).signedUrl || '').trim();

      const fd = new FormData();
      fd.append('file', file);

      const transcribeRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/transcribe`, {
        method: 'POST',
        body: fd,
      });

      if (transcribeRes.status === 402) {
        addToast('אין מספיק נקודות AI לתמלול', 'warning');
        return;
      }

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({} as any));
        addToast(err?.error || 'שגיאה בתמלול', 'error');
        return;
      }

      const transcribeJson = (await transcribeRes.json().catch(() => ({} as any))) as any;
      const transcriptText = String(transcribeJson?.transcriptText || '').trim();
      if (!transcriptText) {
        addToast('תמלול ריק', 'error');
        return;
      }

      const suggestRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/suggest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcriptText }),
      });

      if (suggestRes.status === 402) {
        addToast('אין מספיק נקודות AI לניתוח מתקדם', 'warning');
        return;
      }

      if (!suggestRes.ok) {
        const err = await suggestRes.json().catch(() => ({} as any));
        addToast(err?.error || 'שגיאה בניתוח', 'error');
        return;
      }

      const suggestJson = (await suggestRes.json().catch(() => ({} as any))) as any;
      const analysisResult = suggestJson?.result || {};
      const summaryText = String(analysisResult?.summary || '').trim();

      const activityContent = summaryText ? `ניתוח שיחה (AI):\n${summaryText}` : 'ניתוח שיחה (AI)';
      const res = await createSystemLeadActivity({
        orgSlug,
        leadId: String(lead.id),
        type: 'call',
        content: activityContent,
        metadata: {
          callAnalysis: {
            kind: 'call_recording_ai',
            audio: {
              bucket: audioBucket || undefined,
              path: audioPath || undefined,
              url: audioUrl || undefined,
              signedUrl: audioSignedUrl || undefined,
              fileName: file.name,
              mimeType: file.type || undefined,
            },
            transcriptText,
            analysis: analysisResult,
            ai: {
              transcription: {
                provider: transcribeJson?.provider,
                model: transcribeJson?.model,
                chargedCents: transcribeJson?.chargedCents,
              },
              suggestion: {
                provider: suggestJson?.provider,
                model: suggestJson?.model,
                chargedCents: suggestJson?.chargedCents,
              },
            },
          },
        },
      });

      if (!res.ok) {
        addToast(res.message || 'שגיאה בשמירת פעילות ניתוח שיחה', 'error');
        return;
      }

      addToast('הקלטה נותחה ונשמרה בליד', 'success');
      const ts = (res as any)?.activity?.timestamp ? new Date(String((res as any).activity.timestamp)) : new Date();
      onAddActivity(lead.id, {
        id: String((res as any)?.activity?.id || Date.now().toString()),
        type: 'call',
        content: activityContent,
        timestamp: Number.isNaN(ts.getTime()) ? new Date() : ts,
        direction: (res as any)?.activity?.direction ?? undefined,
        metadata: (res as any)?.activity?.metadata ?? undefined,
      });
    } catch (e: any) {
      console.error(e);
      addToast(e?.message || 'שגיאה בהעלאה/ניתוח הקלטה', 'error');
    } finally {
      setIsUploadingRecording(false);
    }
  };

  const renderCallAnalysisActivity = (act: Activity) => {
    const ca = (act as any)?.metadata?.callAnalysis;
    if (!ca) return null;

    const audio = ca?.audio || {};
    const audioSrc = String(audio?.signedUrl || audio?.url || '').trim();
    const analysis = ca?.analysis || {};
    const score = Number.isFinite(Number(analysis?.score)) ? Number(analysis.score) : null;
    const summary = String(analysis?.summary || '').trim();
    const tasks = Array.isArray(analysis?.topics?.tasks) ? analysis.topics.tasks : [];
    const promises = Array.isArray(analysis?.topics?.promises) ? analysis.topics.promises : [];
    const objections = Array.isArray(analysis?.objections) ? analysis.objections : [];
    const transcript = Array.isArray(analysis?.transcript) ? analysis.transcript : [];

    return (
      <div className="mt-3 space-y-3">
        {audioSrc ? (
          <audio controls className="w-full">
            <source src={audioSrc} />
          </audio>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <div className="text-[11px] font-black text-slate-500">ציון</div>
            <div className="text-lg font-black text-slate-900">{score == null ? '—' : score}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 md:col-span-2">
            <div className="text-[11px] font-black text-slate-500">סיכום</div>
            <div className="text-sm font-bold text-slate-800 whitespace-pre-wrap">{summary || '—'}</div>
          </div>
        </div>

        {(promises.length || tasks.length) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[11px] font-black text-slate-500">התחייבויות</div>
              <div className="mt-2 space-y-1">
                {(promises.length ? promises : ['—']).slice(0, 8).map((p: any, idx: number) => (
                  <div key={idx} className="text-sm font-bold text-slate-800">{String(p)}</div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[11px] font-black text-slate-500">משימות</div>
              <div className="mt-2 space-y-1">
                {(tasks.length ? tasks : ['—']).slice(0, 10).map((t: any, idx: number) => (
                  <div key={idx} className="text-sm font-bold text-slate-800">{String(t)}</div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {objections.length ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="text-[11px] font-black text-slate-500">התנגדויות</div>
            <div className="mt-2 space-y-2">
              {objections.slice(0, 6).map((o: any, idx: number) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="text-xs font-black text-slate-900">{String(o?.objection || '')}</div>
                  <div className="text-sm font-bold text-slate-700 mt-1 whitespace-pre-wrap">{String(o?.reply || '')}</div>
                  {o?.next_question ? (
                    <div className="text-xs font-bold text-slate-500 mt-2">שאלה הבאה: {String(o.next_question)}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {transcript.length ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="text-[11px] font-black text-slate-500">תמלול (דוגמית)</div>
            <div className="mt-2 space-y-2">
              {transcript.slice(0, 10).map((t: any, idx: number) => (
                <div key={idx} className="text-sm font-bold text-slate-800">
                  <span className="text-slate-500">{String(t?.speaker || '')}:</span> {String(t?.text || '')}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const modal = (
    <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-sm z-[9999] flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-white w-full h-[95dvh] md:max-w-[980px] md:h-[90vh] rounded-t-3xl md:rounded-3xl shadow-xl overflow-hidden flex flex-col ring-1 ring-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="min-w-0 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 shrink-0">
              {String(lead.name || 'ל').trim().charAt(0) || 'ל'}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-sm font-black text-slate-900 truncate">{lead.company || 'לקוח פרטי'}</div>
                <div className="shrink-0 text-[11px] font-black px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                  מקור: {String(lead.source || '').trim() || '—'}
                </div>
              </div>
              <div className="text-xs text-slate-500 font-bold truncate">{stageLabel}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-black text-slate-500">שם</div>
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => void handleSaveBasics({ name: draftName })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-black text-slate-500">אחראי</div>
                  <select
                    value={draftAssignedAgentId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftAssignedAgentId(v);
                      void handleSaveBasics({ assignedAgentId: v ? v : null });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                  >
                    <option value="">לא משויך</option>
                    {(assignees || []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-black text-slate-500">טלפון</div>
                  <input
                    value={draftPhone}
                    onChange={(e) => setDraftPhone(e.target.value)}
                    onBlur={() => void handleSaveBasics({ phone: draftPhone })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-black text-slate-500">אימייל</div>
                  <input
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    onBlur={() => void handleSaveBasics({ email: draftEmail.trim() ? draftEmail.trim() : null })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-black text-slate-900">טיפול הבא</div>
                  {followUpTone !== 'none' ? (
                    <div
                      className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${
                        followUpTone === 'overdue'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : followUpTone === 'today'
                            ? 'border-orange-200 bg-orange-50 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {followUpTone === 'today' ? 'לטיפול היום' : followUpTone === 'overdue' ? 'באיחור' : 'מתוזמן'}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-black text-slate-500">תאריך ושעה</div>
                    <input
                      type="datetime-local"
                      value={followUpInput}
                      onChange={(e) => setFollowUpInput(e.target.value)}
                      onBlur={handleSaveFollowUp}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-black text-slate-500">הערה (אופציונלי)</div>
                    <input
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      onBlur={handleSaveFollowUp}
                      placeholder="מה צריך לעשות?"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-900">תיעוד</div>
                    {onStatusChange ? (
                      <select
                        value={lead.status}
                        onChange={(e) => onStatusChange(lead.id, e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-full px-3 py-2 text-xs font-black"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>

                  <div className="flex gap-3 mt-3">
                    {[{ id: 'note', label: 'פתק' }, { id: 'call', label: 'שיחה' }, { id: 'task', label: 'משימה' }, { id: 'email', label: 'מייל' }].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setComposerTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-black border transition-colors ${
                          composerTab === tab.id ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmitActivity} className="mt-3">
                    <div className="relative">
                      <textarea
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:outline-none h-24 resize-none"
                        placeholder="כתוב פעילות..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="absolute bottom-3 left-3 p-2 bg-slate-900 text-white rounded-xl shadow"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </form>
                </div>

                <div className="p-4 space-y-3">
                  {lead.activities
                    .slice()
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((act) => (
                      <div key={act.id} className="border border-slate-200 rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-xs font-black text-slate-700">{act.type}</div>
                          <div className="text-[11px] font-bold text-slate-400">{new Date(act.timestamp).toLocaleString('he-IL')}</div>
                        </div>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap">{act.content}</div>
                        {renderCallAnalysisActivity(act)}
                      </div>
                    ))}

                  {lead.activities.length === 0 ? (
                    <div className="text-sm font-bold text-slate-500">אין עדיין תיעוד לליד.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label
                className={`px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black cursor-pointer ${
                  isUploadingRecording ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {isUploadingRecording ? (
                  <>
                    <Loader2 size={14} className="inline-block ml-1 animate-spin" /> מעבד...
                  </>
                ) : (
                  <>
                    <Paperclip size={14} className="inline-block ml-1" /> העלה הקלטה
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = '';
                    if (!f) return;
                    void handleUploadRecording(f);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={openTel}
                disabled={!String((lead as any)?.phone || '').trim()}
                className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black disabled:opacity-40"
              >
                <Phone size={14} className="inline-block ml-1" /> חייג
              </button>
              <button
                type="button"
                onClick={openWhatsapp}
                disabled={!String((lead as any)?.phone || '').trim()}
                className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black disabled:opacity-40"
              >
                <MessageSquare size={14} className="inline-block ml-1" /> וואטסאפ
              </button>
              <button
                type="button"
                onClick={openEmail}
                disabled={!String((lead as any)?.email || '').trim()}
                className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-black disabled:opacity-40"
              >
                <Mail size={14} className="inline-block ml-1" /> מייל
              </button>
              <button
                type="button"
                onClick={() => onScheduleMeeting(lead.id)}
                className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-black"
              >
                <CalendarClock size={14} className="inline-block ml-1" /> מעקב
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenClientPortal?.()}
              disabled={!canOpenPortal || !onOpenClientPortal}
              className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black disabled:opacity-40"
            >
              פורטל
            </button>
          </div>
        </div>

        <LogCallModal
          open={isLogCallOpen}
          leadName={String(lead.name || '')}
          leadPhone={String((lead as any)?.phone || '')}
          onCloseAction={() => setIsLogCallOpen(false)}
          onUploadRecordingAction={async (file: File) => {
            await handleUploadRecording(file);
          }}
          onSaveAction={async (content) => {
            const text = String(content || '').trim();
            if (!text) return;

            const orgSlug = orgSlugFromPathname();
            if (!orgSlug) {
              addToast('לא ניתן לשמור סיכום שיחה (orgSlug חסר)', 'error');
              return;
            }

            const res = await createSystemLeadActivity({
              orgSlug,
              leadId: String(lead.id),
              type: 'call',
              content: text,
              direction: 'outbound',
            });

            if (!res.ok) {
              addToast(res.message || 'שגיאה בשמירת סיכום שיחה', 'error');
              return;
            }

            addToast('סיכום השיחה נשמר', 'success');
            const ts = (res as any)?.activity?.timestamp ? new Date(String((res as any).activity.timestamp)) : new Date();
            onAddActivity(lead.id, {
              id: String((res as any)?.activity?.id || Date.now().toString()),
              type: 'call',
              content: text,
              timestamp: Number.isNaN(ts.getTime()) ? new Date() : ts,
              direction: 'outbound',
              metadata: (res as any)?.activity?.metadata ?? undefined,
            });
          }}
        />

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
};

export default LeadModal;
