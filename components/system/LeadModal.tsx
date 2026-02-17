'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Lead, SquareActivity, Task } from './types';
import { STAGES } from './constants';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import LogCallModal from './LogCallModal';
import { useToast } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';
import { createSystemLeadActivity, getSystemLeadActivities } from '@/app/actions/system-leads';
import { uploadCallRecordingFile } from '@/app/actions/files';
import { approveConnectOfferDisclosure, createConnectMarketplaceListing, getConnectListingRequests } from '@/app/actions/connect-marketplace';
import { createWorkListing } from '@/app/actions/work-listings';
import { createNexusTaskByOrgSlug, listNexusTasksByOrgSlug } from '@/app/actions/nexus';
import { Priority as NexusPriority } from '../../types';
import {
  LeadModalCallAnalysis,
  LeadModalShareView,
  LeadModalTransferDialog,
  LeadModalActionBar,
} from './lead-modal';
import {
  asObject,
  getErrorMessage,
  getStageLabel,
  isSameLocalDay,
  formatDateTimeShort,
  toLocalDateTimeInputValue,
  getDefaultPublicDescription,
  orgSlugFromPathname,
} from './lead-modal/utils';

interface LeadModalProps {
  lead: Lead;
  onClose: () => void;
  onAddActivity: (leadId: string, SquareActivity: SquareActivity) => void;
  onScheduleMeeting: (leadId: string) => void;
  onStatusChange?: (id: string, status: Lead['status']) => void; 
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
  const { user } = useAuth();
  const pathname = usePathname();
  const [composerTab, setComposerTab] = useState<'note' | 'call' | 'task' | 'email'>('note');
  const [noteContent, setNoteContent] = useState('');
  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [activities, setActivities] = useState<SquareActivity[]>(() => (Array.isArray(lead.activities) ? lead.activities : []));
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftAssignedAgentId, setDraftAssignedAgentId] = useState<string>('');

  const [connectShareMode, setConnectShareMode] = useState<'lead' | 'share'>('lead');
  const [sharePriceInput, setSharePriceInput] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [shareRequests, setShareRequests] = useState<
    Array<{ token: string; interestedName: string; interestedPhone: string; interestedAt: string; approvedAt: string | null }>
  >([]);
  const [approvingToken, setApprovingToken] = useState<string | null>(null);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [transferUrl, setTransferUrl] = useState<string>('');

  const handleApproveDisclosure = async (token: string) => {
    const orgSlug = orgSlugFromPathname(pathname);
    if (!orgSlug) {
      addToast('לא ניתן לאשר (orgSlug חסר)', 'error');
      return;
    }

    if (approvingToken) return;
    setApprovingToken(token);
    try {
      const res = await approveConnectOfferDisclosure({ orgSlug, token });
      if (!res.ok) {
        addToast(res.message || 'שגיאה באישור חשיפה', 'error');
        return;
      }
      addToast('אושר', 'success');
      await loadShareRequests();
    } catch (e: unknown) {
      console.error(e);
      addToast(getErrorMessage(e) || 'שגיאה באישור חשיפה', 'error');
    } finally {
      setApprovingToken(null);
    }
  };

  const [followUpInput, setFollowUpInput] = useState<string>('');
  const [followUpNote, setFollowUpNote] = useState<string>('');

  const [nexusTasks, setNexusTasks] = useState<
    Array<{ id: string; title: string; dueDate: Date | null; status: string; priority: string | null }>
  >([]);
  const [isLoadingNexusTasks, setIsLoadingNexusTasks] = useState(false);
  const [creatingAiTaskKey, setCreatingAiTaskKey] = useState<string | null>(null);
  const [createdAiTaskKeys, setCreatedAiTaskKeys] = useState<string[]>([]);

  useEffect(() => {
    setDraftName(String(lead.name || ''));
    setDraftPhone(String(lead.phone || ''));
    setDraftEmail(String(lead.email || ''));
    setDraftAssignedAgentId(String(lead.assignedAgentId || ''));

    setActivities(Array.isArray(lead.activities) ? lead.activities : []);

    setConnectShareMode('lead');
    setSharePriceInput('');
    setShareDescription(getDefaultPublicDescription(lead));
    setIsCreatingShare(false);
    setShareUrl('');

    setIsLoadingRequests(false);
    setShareRequests([]);
    setApprovingToken(null);

    setIsTransferOpen(false);
    setIsCreatingTransfer(false);
    setTransferUrl('');

    const d = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
    setFollowUpInput(d ? toLocalDateTimeInputValue(d) : '');
    setFollowUpNote(lead.nextActionNote != null ? String(lead.nextActionNote) : '');
  }, [lead.id]);

  const loadActivities = async () => {
    const orgSlug = orgSlugFromPathname(pathname);
    if (!orgSlug) return;
    if (isLoadingActivities) return;
    setIsLoadingActivities(true);
    try {
      const rows = await getSystemLeadActivities({ orgSlug, leadId: String(lead.id), take: 80 });
      const mapped = (Array.isArray(rows) ? rows : []).map((a: unknown): SquareActivity => {
        const aObj = asObject(a) ?? {};
        const directionRaw = aObj.direction ? String(aObj.direction) : '';
        const direction = directionRaw === 'inbound' || directionRaw === 'outbound' ? directionRaw : undefined;
        const ts = aObj.timestamp ? new Date(String(aObj.timestamp)) : new Date();
        const timestamp = Number.isNaN(ts.getTime()) ? new Date() : ts;

        const typeRaw = String(aObj.type || 'note');
        const type: SquareActivity['type'] =
          typeRaw === 'call' ||
          typeRaw === 'whatsapp' ||
          typeRaw === 'email' ||
          typeRaw === 'meeting' ||
          typeRaw === 'note' ||
          typeRaw === 'system' ||
          typeRaw === 'financial' ||
          typeRaw === 'sms' ||
          typeRaw === 'feedback' ||
          typeRaw === 'support'
            ? typeRaw
            : 'note';

        return {
          id: String(aObj.id || ''),
          type,
          content: String(aObj.content || ''),
          timestamp,
          direction,
          metadata: (aObj.metadata ?? null) as SquareActivity['metadata'],
        };
      });
      setActivities(mapped.filter((a) => a.id));
    } catch {
      // ignore
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    void loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const mapNexusTaskForLead = (t: unknown) => {
    const obj = asObject(t) ?? {};
    const due = obj.dueDate ? new Date(String(obj.dueDate)) : null;
    const dueDate = due && !Number.isNaN(due.getTime()) ? due : null;
    return {
      id: String(obj.id || ''),
      title: String(obj.title || ''),
      dueDate,
      status: String(obj.status || ''),
      priority: obj.priority == null ? null : String(obj.priority),
    };
  };

  const loadNexusTasksForLead = async () => {
    const orgSlug = orgSlugFromPathname(pathname);
    if (!orgSlug) return;
    setIsLoadingNexusTasks(true);
    try {
      const res = await listNexusTasksByOrgSlug({ orgSlug, leadId: String(lead.id), page: 1, pageSize: 50 });
      const rows = Array.isArray(res?.tasks) ? res.tasks : [];
      setNexusTasks(rows.map(mapNexusTaskForLead).filter((t) => t.id));
    } catch (e: unknown) {
      console.error(e);
      addToast(getErrorMessage(e) || 'שגיאה בטעינת משימות', 'error');
    } finally {
      setIsLoadingNexusTasks(false);
    }
  };

  useEffect(() => {
    void loadNexusTasksForLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const handleCreateTransfer = async (mode: 'link' | 'marketplace') => {
    const orgSlug = orgSlugFromPathname(pathname);
    if (!orgSlug) {
      addToast('לא ניתן ליצור קישור (orgSlug חסר)', 'error');
      return;
    }

    if (isCreatingTransfer) return;
    setIsCreatingTransfer(true);
    try {
      const title = String(lead.company || lead.name || '').trim() || 'עבודה חדשה';
      const rawPrice = lead.value;
      const price = Number.isFinite(Number(rawPrice)) ? Number(rawPrice) : null;

      const res = await createWorkListing({
        orgSlug,
        leadId: String(lead.id),
        mode,
        title,
        price: price && price > 0 ? price : null,
      });

      if (!res.ok) {
        addToast(res.message || 'שגיאה ביצירת קישור', 'error');
        return;
      }

      const resObj = asObject(res);
      setTransferUrl(typeof resObj?.publicUrl === 'string' ? String(resObj.publicUrl) : '');
      addToast(mode === 'marketplace' ? 'פורסם לזירה (ממתין)' : 'הקישור נוצר', 'success');
    } catch (e: unknown) {
      console.error(e);
      addToast(getErrorMessage(e) || 'שגיאה ביצירת קישור', 'error');
    } finally {
      setIsCreatingTransfer(false);
    }
  };

  const handleCopyTransferUrl = async () => {
    const url = String(transferUrl || '').trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      addToast('הקישור הועתק', 'success');
    } catch {
      addToast('לא ניתן להעתיק קישור', 'error');
    }
  };

  const handleWhatsappTransferUrl = () => {
    const url = String(transferUrl || '').trim();
    if (!url) return;
    const text = `MISRAD - עבודה להעברה\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const loadShareRequests = async () => {
    const orgSlug = orgSlugFromPathname(pathname);
    if (!orgSlug) {
      addToast('לא ניתן לטעון בקשות (orgSlug חסר)', 'error');
      return;
    }

    if (isLoadingRequests) return;
    setIsLoadingRequests(true);
    try {
      const res = await getConnectListingRequests({ orgSlug, leadId: String(lead.id) });
      if (!res.ok) {
        addToast(res.message || 'שגיאה בטעינת בקשות', 'error');
        return;
      }
      const resObj = asObject(res);
      const requests = resObj?.requests;
      setShareRequests(Array.isArray(requests) ? (requests as Array<{ token: string; interestedName: string; interestedPhone: string; interestedAt: string; approvedAt: string | null }>) : []);
    } catch (e: unknown) {
      console.error(e);
      addToast(getErrorMessage(e) || 'שגיאה בטעינת בקשות', 'error');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (connectShareMode !== 'share') return;
    void loadShareRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectShareMode, lead.id]);

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

  const suggestedFollowUpDate = lead.nextActionDateSuggestion ? new Date(lead.nextActionDateSuggestion) : null;
  const hasSuggestedFollowUp = Boolean(suggestedFollowUpDate && !Number.isNaN(suggestedFollowUpDate.getTime()));

  const handleSubmitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    
    const typeMap: Record<string, SquareActivity['type']> = {
        'note': 'note', 'call': 'call', 'email': 'email', 'task': 'system'
    };

    const newActivity: SquareActivity = {
      id: Date.now().toString(),
      type: typeMap[composerTab],
      content: noteContent,
      timestamp: new Date()
    };
    onAddActivity(lead.id, newActivity);
    setNoteContent('');
  };

  const stageLabel = getStageLabel(lead.status);

  const stagesForSelect = useMemo(() => {
    const base = Array.isArray(STAGES) ? STAGES : [];
    const current = String(lead.status || '').trim();
    if (!current) return base;
    if (base.some((s) => String(s.id) === current)) return base;
    return [...base, { id: current as unknown, label: current, color: 'border-slate-200', accent: 'bg-slate-300' }];
  }, [lead.status]);

  const canOpenPortal = !!String(lead.email || '').trim();

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
    const phone = String(lead.phone || '').trim();
    if (!phone) return;
    window.location.href = `tel:${phone}`;
    setIsLogCallOpen(true);
  };

  const openEmail = () => {
    const email = String(lead.email || '').trim();
    if (!email) return;
    window.open(`mailto:${encodeURIComponent(email)}`);
  };

  const openWhatsapp = () => {
    const phone = String(lead.phone || '').trim();
    const digits = phone.replace(/[^0-9]/g, '');
    if (!digits) return;
    window.open(`https://wa.me/${digits}`);
  };

  const handleCreateShareLink = async () => {
    const orgSlug = orgSlugFromPathname(pathname);
    if (!orgSlug) {
      addToast('לא ניתן ליצור קישור (orgSlug חסר)', 'error');
      return;
    }

    if (isCreatingShare) return;
    setIsCreatingShare(true);
    try {
      const askingPriceRaw = sharePriceInput.trim();
      const askingPrice = askingPriceRaw ? Number(askingPriceRaw) : 0;
      if (Number.isNaN(askingPrice) || askingPrice < 0) {
        addToast('מחיר לא תקין', 'error');
        return;
      }

      const res = await createConnectMarketplaceListing({
        orgSlug,
        leadId: String(lead.id),
        askingPrice: askingPrice > 0 ? askingPrice : null,
        description: shareDescription.trim() ? shareDescription.trim() : null,
      });

      if (!res.ok) {
        addToast(res.message || 'שגיאה ביצירת קישור שיתוף', 'error');
        return;
      }

      const resObj = asObject(res);
      const url = typeof resObj?.publicUrl === 'string' ? resObj.publicUrl : typeof resObj?.url === 'string' ? resObj.url : '';
      setShareUrl(String(url || ''));
      addToast('הקישור נוצר', 'success');
    } catch (e: unknown) {
      console.error(e);
      addToast(getErrorMessage(e) || 'שגיאה ביצירת קישור שיתוף', 'error');
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleCopyShareLink = async () => {
    const url = String(shareUrl || '').trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      addToast('הקישור הועתק', 'success');
    } catch {
      addToast('לא ניתן להעתיק קישור', 'error');
    }
  };

  const handleWhatsappShareLink = () => {
    const url = String(shareUrl || '').trim();
    if (!url) return;
    const text = `MISRAD Connect - עבודה להעברה\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleUploadRecording = async (file: File) => {
    const orgSlug = orgSlugFromPathname(pathname);
    if (!orgSlug) {
      addToast('לא ניתן להעלות הקלטה (orgSlug חסר)', 'error');
      return;
    }

    setIsUploadingRecording(true);
    try {
      const uploadRes = await uploadCallRecordingFile(file, file.name, String(lead.id), orgSlug);
      if (!uploadRes.success) {
        addToast(uploadRes.error || 'שגיאה בהעלאת הקלטה', 'error');
        return;
      }

      const audioUrl = String(uploadRes.url || '').trim();
      const audioPath = String(uploadRes.path || '').trim();
      const audioBucket = String(uploadRes.bucket || '').trim();
      const audioSignedUrl = String(uploadRes.signedUrl || '').trim();

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
        const errData: unknown = await transcribeRes.json().catch(() => ({}));
        const errObj = asObject(errData);
        addToast(typeof errObj?.error === 'string' ? errObj.error : 'שגיאה בתמלול', 'error');
        return;
      }

      const transcribeData: unknown = await transcribeRes.json().catch(() => ({}));
      const transcribeJson = asObject(transcribeData) ?? {};
      const transcriptText = String(transcribeJson.transcriptText || '').trim();
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
        const errData: unknown = await suggestRes.json().catch(() => ({}));
        const errObj = asObject(errData);
        addToast(typeof errObj?.error === 'string' ? errObj.error : 'שגיאה בניתוח', 'error');
        return;
      }

      const suggestData: unknown = await suggestRes.json().catch(() => ({}));
      const suggestJson = asObject(suggestData) ?? {};
      const analysisResult = suggestJson.result;
      const analysisObj = asObject(analysisResult) ?? {};
      const summaryText = String(analysisObj.summary || '').trim();

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
            analysis: analysisResult ?? {},
            ai: {
              transcription: {
                provider: typeof transcribeJson.provider === 'string' ? transcribeJson.provider : undefined,
                model: typeof transcribeJson.model === 'string' ? transcribeJson.model : undefined,
                chargedCents: typeof transcribeJson.chargedCents === 'number' ? transcribeJson.chargedCents : undefined,
              },
              suggestion: {
                provider: typeof suggestJson.provider === 'string' ? suggestJson.provider : undefined,
                model: typeof suggestJson.model === 'string' ? suggestJson.model : undefined,
                chargedCents: typeof suggestJson.chargedCents === 'number' ? suggestJson.chargedCents : undefined,
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
      const activityObj = asObject(asObject(res)?.SquareActivity) ?? {};
      const ts = activityObj.timestamp ? new Date(String(activityObj.timestamp)) : new Date();
      onAddActivity(lead.id, {
        id: String(activityObj.id || Date.now().toString()),
        type: 'call',
        content: activityContent,
        timestamp: Number.isNaN(ts.getTime()) ? new Date() : ts,
        direction: activityObj.direction === 'inbound' || activityObj.direction === 'outbound' ? activityObj.direction : undefined,
        metadata: (activityObj.metadata as Record<string, unknown> | undefined) ?? undefined,
      });
    } catch (e: unknown) {
      console.error(e);
      addToast(getErrorMessage(e) || 'שגיאה בהעלאה/ניתוח הקלטה', 'error');
    } finally {
      setIsUploadingRecording(false);
    }
  };

  const handleCreateAiTask = async (key: string, taskText: string) => {
    const orgSlug = orgSlugFromPathname(pathname);
    if (!orgSlug) {
      addToast('לא ניתן ליצור משימה (orgSlug חסר)', 'error');
      return;
    }

    const assigneeId = String(draftAssignedAgentId || lead.assignedAgentId || user?.id || '').trim();
    if (!assigneeId) {
      addToast('לא ניתן ליצור משימה ללא אחראי', 'error');
      return;
    }

    const now = new Date();
    const suggested = new Date(now);
    suggested.setDate(suggested.getDate() + 1);
    suggested.setHours(10, 0, 0, 0);

    setCreatingAiTaskKey(key);
    try {
      const dueDate = suggested.toISOString().slice(0, 10);
      const dueTime = suggested.toTimeString().slice(0, 8);

      await createNexusTaskByOrgSlug({
        orgSlug,
        input: {
          title: taskText,
          description: '',
          status: 'todo',
          priority: NexusPriority.HIGH,
          assigneeId,
          assigneeIds: [assigneeId],
          tags: ['Call', 'Follow Up'],
          dueDate,
          dueTime,
          timeSpent: 0,
          isTimerRunning: false,
          messages: [],
          createdAt: new Date().toISOString(),
          leadId: String(lead.id),
        },
      });

      setCreatedAiTaskKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      addToast('נוצרה משימה', 'success');
      await loadNexusTasksForLead();
    } catch (e: unknown) {
      console.error(e);
      addToast(getErrorMessage(e) || 'שגיאה ביצירת משימה', 'error');
    } finally {
      setCreatingAiTaskKey(null);
    }
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

          <div className="flex items-center gap-2">
            {connectShareMode === 'share' ? (
              <button
                type="button"
                onClick={() => setConnectShareMode('lead')}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {connectShareMode === 'share' ? (
          <LeadModalShareView
            sharePriceInput={sharePriceInput}
            onSharePriceChange={setSharePriceInput}
            shareDescription={shareDescription}
            onShareDescriptionChange={setShareDescription}
            shareUrl={shareUrl}
            isCreatingShare={isCreatingShare}
            onCreateShareLink={() => void handleCreateShareLink()}
            onCopyShareLink={() => void handleCopyShareLink()}
            onWhatsappShareLink={handleWhatsappShareLink}
            isLoadingRequests={isLoadingRequests}
            shareRequests={shareRequests}
            onRefreshRequests={() => void loadShareRequests()}
            approvingToken={approvingToken}
            onApproveDisclosure={(token) => void handleApproveDisclosure(token)}
          />
        ) : (
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

                {!lead.nextActionDate && hasSuggestedFollowUp ? (
                  <div className="mb-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-indigo-900">הצעת תזכורת</div>
                        <div className="mt-1 text-sm font-black text-slate-900">
                          {formatDateTimeShort(suggestedFollowUpDate as Date)}
                        </div>
                        {String(lead.nextActionDateRationale || '').trim() ? (
                          <div className="mt-1 text-xs font-bold text-indigo-900/80">
                            {String(lead.nextActionDateRationale)}
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!onUpdateLead || !suggestedFollowUpDate) return;
                          setFollowUpInput(toLocalDateTimeInputValue(suggestedFollowUpDate));
                          onUpdateLead({
                            leadId: lead.id,
                            nextActionDate: suggestedFollowUpDate,
                            nextActionNote: followUpNote.trim() ? followUpNote : null,
                          });
                        }}
                        className="shrink-0 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-black"
                      >
                        קבע
                      </button>
                    </div>
                  </div>
                ) : null}

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
                    <div className="text-sm font-black text-slate-900">משימות (Nexus)</div>
                    <button
                      type="button"
                      onClick={() => void loadNexusTasksForLead()}
                      disabled={isLoadingNexusTasks}
                      className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black disabled:opacity-40"
                    >
                      רענן
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {isLoadingNexusTasks ? (
                    <div className="text-sm font-bold text-slate-500">טוען...</div>
                  ) : nexusTasks.length ? (
                    nexusTasks.slice(0, 8).map((t) => (
                      <div key={t.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate">{t.title}</div>
                          <div className="text-[11px] font-bold text-slate-500 mt-1">
                            {t.dueDate ? t.dueDate.toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ללא תאריך'}
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] font-black px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                          {t.status || 'todo'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm font-bold text-slate-500">אין עדיין משימות לליד הזה.</div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-900">תיעוד</div>
                    {onStatusChange ? (
                      <select
                        value={lead.status}
                        onChange={(e) => onStatusChange(lead.id, e.target.value as Lead['status'])}
                        className="bg-white border border-slate-200 rounded-full px-3 py-2 text-xs font-black"
                      >
                        {stagesForSelect.map((s) => (
                          <option key={String(s.id)} value={String(s.id)}>
                            {String(s.label)}
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
                        onClick={() => setComposerTab(tab.id as 'note' | 'call' | 'task' | 'email')}
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
                  {activities
                    .slice()
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((act) => (
                      <div key={act.id} className="border border-slate-200 rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-xs font-black text-slate-700">{act.type}</div>
                          <div className="text-[11px] font-bold text-slate-400">{new Date(act.timestamp).toLocaleString('he-IL')}</div>
                        </div>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap">{act.content}</div>
                        <LeadModalCallAnalysis
                          SquareActivity={act}
                          createdAiTaskKeys={createdAiTaskKeys}
                          creatingAiTaskKey={creatingAiTaskKey}
                          onCreateTask={handleCreateAiTask}
                        />
                      </div>
                    ))}

                  {activities.length === 0 ? (
                    <div className="text-sm font-bold text-slate-500">אין עדיין תיעוד לליד.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {connectShareMode === 'lead' ? (
          <LeadModalActionBar
            leadPhone={String(lead.phone || '')}
            leadEmail={String(lead.email || '')}
            leadId={lead.id}
            isUploadingRecording={isUploadingRecording}
            canOpenPortal={canOpenPortal}
            onOpenTel={openTel}
            onOpenWhatsapp={openWhatsapp}
            onOpenEmail={openEmail}
            onScheduleMeeting={onScheduleMeeting}
            onOpenTransfer={() => setIsTransferOpen(true)}
            onOpenClientPortal={onOpenClientPortal}
            onUploadRecording={(f) => void handleUploadRecording(f)}
          />
        ) : null}

        {connectShareMode === 'lead' ? (
          <LogCallModal
            open={isLogCallOpen}
            leadName={String(lead.name || '')}
            leadPhone={String(lead.phone || '')}
            onCloseAction={() => setIsLogCallOpen(false)}
            onUploadRecordingAction={async (file: File) => {
              await handleUploadRecording(file);
            }}
            onSaveAction={async (content) => {
              const text = String(content || '').trim();
              if (!text) return;

              const orgSlug = orgSlugFromPathname(pathname);
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
              const activityObj = asObject(asObject(res)?.SquareActivity) ?? {};
              const ts = activityObj.timestamp ? new Date(String(activityObj.timestamp)) : new Date();
              onAddActivity(lead.id, {
                id: String(activityObj.id || Date.now().toString()),
                type: 'call',
                content: text,
                timestamp: Number.isNaN(ts.getTime()) ? new Date() : ts,
                direction: 'outbound',
                metadata: (activityObj.metadata as Record<string, unknown> | undefined) ?? undefined,
              });
            }}
          />
        ) : null}

        {isTransferOpen ? (
          <LeadModalTransferDialog
            isCreatingTransfer={isCreatingTransfer}
            transferUrl={transferUrl}
            onCreateTransfer={(mode) => void handleCreateTransfer(mode)}
            onCopyTransferUrl={() => void handleCopyTransferUrl()}
            onWhatsappTransferUrl={handleWhatsappTransferUrl}
            onResetTransferUrl={() => setTransferUrl('')}
            onClose={() => setIsTransferOpen(false)}
          />
        ) : null}

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
};

export default LeadModal;
