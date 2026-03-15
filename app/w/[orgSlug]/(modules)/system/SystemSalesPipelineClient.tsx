'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { UserPlus, Link2, Check, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Lead, PipelineStage, Activity as LeadActivity, isSystemStage } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { useToast } from '@/components/system/contexts/ToastContext';
import LeadModal from '@/components/system/LeadModal';
import NewLeadModal from '@/components/system/NewLeadModal';
import SmartImportLeadsDialog from '@/components/system/SmartImportLeadsDialog';
import PipelineBoard from '@/components/system/PipelineBoard';
import { STAGES } from '@/components/system/constants';
import { getErrorMessage } from '@/lib/shared/unknown';
import {
  getLeadCaptureSettings,
  updateLeadCaptureSettings,
  type LeadCaptureSettings,
} from '@/app/actions/system-lead-capture-settings';
import {
  createSystemLead,
  createSystemLeadActivity,
  getSystemLeadsPage,
  getSystemLeadAssignees,
  SystemLeadDTO,
  updateSystemLead,
  updateSystemLeadFollowUp,
  updateSystemLeadStatus,
  type SystemLeadUserRole,
} from '@/app/actions/system-leads';
import {
  createSystemPipelineStage,
  deleteSystemPipelineStage,
  getSystemPipelineStages,
  type SystemPipelineStageDTO,
  updateSystemPipelineStage,
} from '@/app/actions/system-pipeline-stages';

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type StageUi = {
  id: string;
  key: string;
  label: string;
  color: string;
  accent: string;
  order: number;
  isActive: boolean;
};

export default function SystemSalesPipelineClient({
  orgSlug,
  initialLeads,
  initialNextCursor,
  initialHasMore,
  initialStages,
  userRole = 'admin',
  currentUserId = null,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  initialStages: SystemPipelineStageDTO[];
  userRole?: SystemLeadUserRole;
  currentUserId?: string | null;
}) {
  const isAdmin = userRole === 'admin';
  const { addToast } = useToast();
  const router = useRouter();
  const basePath = useMemo(() => `/w/${encodeURIComponent(orgSlug)}/system`, [orgSlug]);
  const [leads, setLeads] = useState<SystemLeadDTO[]>(initialLeads);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(Boolean(initialHasMore));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<SystemPipelineStageDTO[]>(initialStages || []);
  const [isStagesModalOpen, setIsStagesModalOpen] = useState(false);
  const [isStagesSaving, setIsStagesSaving] = useState(false);
  const [newStageKey, setNewStageKey] = useState('');
  const [newStageLabel, setNewStageLabel] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ stageId: string; stageKey: string; stageLabel: string; leadCount: number; moveToKey: string } | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string; email: string | null; avatarUrl: string | null }>>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [lcSettings, setLcSettings] = useState<LeadCaptureSettings>({ leadCaptureEnabled: false, leadCaptureEmailNotify: true });
  const [lcLoading, setLcLoading] = useState(false);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    if (!hasMore) return;
    try {
      setIsLoadingMore(true);
      const res = await getSystemLeadsPage({ orgSlug, cursor: nextCursor, pageSize: 200 });
      if (!res.success) {
        addToast(res.error || 'שגיאה בטעינת לידים', 'error');
        return;
      }

      setLeads((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const incoming = Array.isArray(res.data.leads) ? res.data.leads : [];
        const byId = new Map<string, SystemLeadDTO>();
        for (const l of base) byId.set(String(l.id), l);
        for (const l of incoming) byId.set(String(l.id), l);
        return Array.from(byId.values());
      });

      setNextCursor(res.data.nextCursor);
      setHasMore(Boolean(res.data.hasMore));
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בטעינת לידים', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const refreshFirstPage = async () => {
    try {
      const res = await getSystemLeadsPage({ orgSlug, pageSize: 200 });
      if (!res.success) {
        addToast(res.error || 'שגיאה בטעינת לידים', 'error');
        return;
      }

      setLeads(res.data.leads);
      setNextCursor(res.data.nextCursor);
      setHasMore(Boolean(res.data.hasMore));
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בטעינת לידים', 'error');
    }
  };

  useEffect(() => {
    const onOpenNewLead = () => {
      setShowNewLeadModal(true);
    };

    const onOpenNewLeadListener: EventListener = () => {
      onOpenNewLead();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('system:new-lead', onOpenNewLeadListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('system:new-lead', onOpenNewLeadListener);
      }
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await getSystemLeadAssignees({ orgSlug });
        setAssignees(rows);
      } catch {
        // non-critical — assignees dropdown will just be empty
      }
    })();
    void (async () => {
      try {
        const s = await getLeadCaptureSettings({ orgSlug });
        setLcSettings(s);
      } catch {
        // non-critical
      }
    })();
  }, [orgSlug]);

  const handleToggleLeadCapture = async () => {
    setLcLoading(true);
    try {
      const res = await updateLeadCaptureSettings({ orgSlug, leadCaptureEnabled: !lcSettings.leadCaptureEnabled });
      if (res.ok) {
        setLcSettings(res.settings);
        addToast(res.settings.leadCaptureEnabled ? '\u05d8\u05d5\u05e4\u05e1 \u05dc\u05d9\u05d3\u05d9\u05dd \u05d4\u05d5\u05e4\u05e2\u05dc!' : '\u05d8\u05d5\u05e4\u05e1 \u05dc\u05d9\u05d3\u05d9\u05dd \u05db\u05d5\u05d1\u05d4', 'success');
      } else {
        addToast(res.message || '\u05e9\u05d2\u05d9\u05d0\u05d4', 'error');
      }
    } catch {
      addToast('\u05e9\u05d2\u05d9\u05d0\u05d4 \u05d1\u05e2\u05d3\u05db\u05d5\u05df \u05d4\u05d2\u05d3\u05e8\u05d5\u05ea', 'error');
    } finally {
      setLcLoading(false);
    }
  };

  const handleToggleEmailNotify = async () => {
    setLcLoading(true);
    try {
      const res = await updateLeadCaptureSettings({ orgSlug, leadCaptureEmailNotify: !lcSettings.leadCaptureEmailNotify });
      if (res.ok) {
        setLcSettings(res.settings);
        addToast(res.settings.leadCaptureEmailNotify ? '\u05d4\u05ea\u05e8\u05d0\u05d5\u05ea \u05de\u05d9\u05d9\u05dc \u05d4\u05d5\u05e4\u05e2\u05dc\u05d5' : '\u05d4\u05ea\u05e8\u05d0\u05d5\u05ea \u05de\u05d9\u05d9\u05dc \u05db\u05d5\u05d1\u05d5', 'success');
      }
    } catch {
      addToast('\u05e9\u05d2\u05d9\u05d0\u05d4', 'error');
    } finally {
      setLcLoading(false);
    }
  };

  const [leadFormCopied, setLeadFormCopied] = useState(false);

  const leadFormUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/lead/${orgSlug}`
    : `/lead/${orgSlug}`;

  const handleCopyLeadFormLink = () => {
    void navigator.clipboard.writeText(leadFormUrl).then(() => {
      setLeadFormCopied(true);
      addToast('קישור לטופס לידים הועתק!', 'success');
      setTimeout(() => setLeadFormCopied(false), 2000);
    });
  };

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PipelineStage>('all');
  const [todayOnly, setTodayOnly] = useState(false);
  const [sortKey, setSortKey] = useState<'created_desc' | 'created_asc' | 'value_desc' | 'value_asc' | 'name_asc' | 'name_desc'>(
    'created_desc'
  );

  const stagesForUi = useMemo(() => {
    const rows: StageUi[] = Array.isArray(pipelineStages) && pipelineStages.length
      ? pipelineStages.map((s) => ({
          id: String(s.key || s.id),
          key: String(s.key || s.id),
          label: String(s.label || ''),
          color: String(s.color || '') || 'border-slate-200',
          accent: String(s.accent || '') || 'bg-slate-300',
          order: Number(s.order || 0),
          isActive: s.isActive !== false,
        }))
      : STAGES.map((s, idx) => ({
          id: String(s.id),
          key: String(s.id),
          label: String(s.label),
          color: String(s.color || '') || 'border-slate-200',
          accent: String(s.accent || '') || 'bg-slate-300',
          order: idx * 10,
          isActive: true,
        }));

    const normalized: StageUi[] = rows.filter((s) => s.isActive !== false);

    const stageKeys = new Set(normalized.map((s) => String(s.id)));
    const missing = new Set<string>();
    leads.forEach((l) => {
      const k = String(l.status || '').trim();
      if (k && !stageKeys.has(k)) {
        missing.add(k);
      }
    });

    // בודק אם 'incoming' חסר למרות שהוא שלב חובה ללידים חדשים
    if (!stageKeys.has('incoming') && !missing.has('incoming')) {
      missing.add('incoming');
    }

    const synthesized = Array.from(missing).map((k, idx) => ({
      id: k,
      key: k,
      label: k === 'incoming' ? 'נכנס' : k,
      color: 'border-slate-200',
      accent: 'bg-slate-300',
      order: k === 'incoming' ? -1 : 10000 + idx,
      isActive: true,
    }));

    const all = [...normalized, ...synthesized];
    all.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    return all;
  }, [leads, pipelineStages]);

  const refreshStages = async () => {
    try {
      const rows = await getSystemPipelineStages({ orgSlug });
      setPipelineStages(Array.isArray(rows) ? rows : []);
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בטעינת שלבים', 'error');
    }
  };

  const handleCreateStage = async () => {
    const key = newStageKey.trim();
    const label = newStageLabel.trim();
    if (!key || !label) {
      addToast('חובה להזין key ושם שלב', 'error');
      return;
    }

    setIsStagesSaving(true);
    try {
      const maxOrder = stagesForUi.reduce((m, s) => Math.max(m, Number(s.order || 0)), 0);
      const res = await createSystemPipelineStage({
        orgSlug,
        key,
        label,
        order: maxOrder + 10,
      });
      if (!res.ok) {
        addToast(res.message || 'שגיאה ביצירת שלב', 'error');
        return;
      }
      setNewStageKey('');
      setNewStageLabel('');
      await refreshStages();
      addToast('שלב נוסף', 'success');
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה ביצירת שלב', 'error');
    } finally {
      setIsStagesSaving(false);
    }
  };

  const handleUpdateStage = async (id: string, patch: { label?: string; order?: number | null; accent?: string | null; color?: string | null }) => {
    setIsStagesSaving(true);
    try {
      const res = await updateSystemPipelineStage({
        orgSlug,
        id,
        label: patch.label,
        order: patch.order,
        accent: patch.accent,
        color: patch.color,
      });
      if (!res.ok) {
        addToast(res.message || 'שגיאה בעדכון שלב', 'error');
        return;
      }
      await refreshStages();
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בעדכון שלב', 'error');
    } finally {
      setIsStagesSaving(false);
    }
  };

  const handleDeleteStage = async (id: string) => {
    const stage = (pipelineStages || []).find((s) => String(s.id) === id);
    if (stage?.key === 'incoming') {
      addToast('לא ניתן למחוק את שלב הלידים הנכנסים', 'error');
      return;
    }
    setStageError(null);
    setIsStagesSaving(true);
    try {
      const res = await deleteSystemPipelineStage({ orgSlug, id });
      if (!res.ok) {
        const lc = 'leadCount' in res ? (res.leadCount ?? 0) : 0;
        if (lc > 0) {
          // Stage has leads — show confirmation dialog with stage picker
          const stage = (pipelineStages || []).find((s) => String(s.id) === id);
          setDeleteConfirm({
            stageId: id,
            stageKey: stage?.key || '',
            stageLabel: stage?.label || stage?.key || '',
            leadCount: lc,
            moveToKey: '',
          });
        } else {
          setStageError(res.message || 'שגיאה במחיקת שלב');
        }
        return;
      }
      setDeleteConfirm(null);
      await Promise.all([refreshStages(), refreshFirstPage()]);
      addToast('שלב נמחק', 'success');
    } catch (e: unknown) {
      setStageError(getErrorMessage(e) || 'שגיאה במחיקת שלב');
    } finally {
      setIsStagesSaving(false);
    }
  };

  const handleConfirmDeleteWithMove = async () => {
    if (!deleteConfirm) return;
    if (!deleteConfirm.moveToKey) {
      setStageError('בחר שלב יעד להעברת הלידים');
      return;
    }
    setStageError(null);
    setIsStagesSaving(true);
    try {
      const res = await deleteSystemPipelineStage({
        orgSlug,
        id: deleteConfirm.stageId,
        moveLeadsToKey: deleteConfirm.moveToKey,
      });
      if (!res.ok) {
        setStageError(res.message || 'שגיאה במחיקת שלב');
        return;
      }
      setDeleteConfirm(null);
      await Promise.all([refreshStages(), refreshFirstPage()]);
      addToast('שלב נמחק והלידים הועברו', 'success');
    } catch (e: unknown) {
      setStageError(getErrorMessage(e) || 'שגיאה במחיקת שלב');
    } finally {
      setIsStagesSaving(false);
    }
  };

  const leadCards = useMemo(() => leads.map(mapDtoToLead), [leads]);

  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = leadCards;
    if (statusFilter !== 'all') {
      items = items.filter((l) => l.status === statusFilter);
    }
    if (q) {
      items = items.filter((l) => {
        const name = String(l.name || '').toLowerCase();
        const company = String(l.company || '').toLowerCase();
        const phone = String(l.phone || '').toLowerCase();
        const email = String(l.email || '').toLowerCase();
        return name.includes(q) || company.includes(q) || phone.includes(q) || email.includes(q);
      });
    }

    if (todayOnly) {
      const now = new Date();
      items = items.filter((l) => {
        const d = l.nextActionDate ? new Date(l.nextActionDate) : null;
        if (!d) return false;
        return isSameLocalDay(d, now);
      });
    }

    const sorted = [...items];
    sorted.sort((a, b) => {
      if (sortKey === 'created_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === 'created_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === 'value_desc') return Number(b.value || 0) - Number(a.value || 0);
      if (sortKey === 'value_asc') return Number(a.value || 0) - Number(b.value || 0);
      if (sortKey === 'name_desc') return String(b.name || '').localeCompare(String(a.name || ''), 'he');
      return String(a.name || '').localeCompare(String(b.name || ''), 'he');
    });

    return sorted;
  }, [leadCards, query, sortKey, statusFilter, todayOnly]);

  const handleUpdateFollowUp = async (params: { leadId: string; nextActionDate: Date | null; nextActionNote: string | null }) => {
    const leadId = String(params.leadId);
    const prevSnapshot = leads;
    setLeads((prev) =>
      prev.map((l) =>
        String(l.id) === leadId
          ? {
              ...l,
              next_action_date: params.nextActionDate ? params.nextActionDate.toISOString() : null,
              next_action_note: params.nextActionNote ?? null,
              next_action_date_suggestion: null,
              next_action_date_rationale: null,
            }
          : l
      )
    );

    try {
      const res = await updateSystemLeadFollowUp({
        orgSlug,
        leadId,
        nextActionDate: params.nextActionDate ? params.nextActionDate.toISOString() : null,
        nextActionNote: params.nextActionNote ?? null,
      });
      if (!res.ok) {
        setLeads(prevSnapshot);
        addToast(res.message || 'שגיאה בעדכון follow-up', 'error');
        return;
      }
      setLeads((prev) => prev.map((l) => (String(l.id) === leadId ? res.lead : l)));
    } catch (e: unknown) {
      setLeads(prevSnapshot);
      addToast(getErrorMessage(e) || 'שגיאה בעדכון follow-up', 'error');
    }
  };

  const handleUpdateLead = async (params: {
    leadId: string;
    name?: string;
    phone?: string;
    email?: string | null;
    assignedAgentId?: string | null;
    nextActionDate?: Date | null;
    nextActionNote?: string | null;
  }) => {
    const leadId = String(params.leadId);
    const prevSnapshot = leads;

    setLeads((prev) =>
      prev.map((l) => {
        if (String(l.id) !== leadId) return l;
        return {
          ...l,
          name: params.name !== undefined ? String(params.name) : l.name,
          phone: params.phone !== undefined ? String(params.phone) : l.phone,
          email: params.email !== undefined ? (params.email == null ? '' : String(params.email)) : l.email,
          assigned_agent_id:
            params.assignedAgentId !== undefined ? (params.assignedAgentId == null ? null : String(params.assignedAgentId)) : l.assigned_agent_id,
          next_action_date:
            params.nextActionDate !== undefined ? (params.nextActionDate ? params.nextActionDate.toISOString() : null) : l.next_action_date,
          next_action_date_suggestion:
            params.nextActionDate !== undefined ? null : l.next_action_date_suggestion,
          next_action_date_rationale:
            params.nextActionDate !== undefined ? null : l.next_action_date_rationale,
          next_action_note:
            params.nextActionNote !== undefined ? (params.nextActionNote ?? null) : l.next_action_note,
        };
      })
    );

    try {
      const res = await updateSystemLead({
        orgSlug,
        leadId,
        name: params.name,
        phone: params.phone,
        email: params.email,
        assignedAgentId: params.assignedAgentId,
        nextActionDate: params.nextActionDate !== undefined ? (params.nextActionDate ? params.nextActionDate.toISOString() : null) : undefined,
        nextActionNote: params.nextActionNote,
      });

      if (!res.ok) {
        setLeads(prevSnapshot);
        addToast(res.message || 'שגיאה בעדכון ליד', 'error');
        return;
      }

      setLeads((prev) => prev.map((l) => (String(l.id) === leadId ? res.lead : l)));
      addToast('עודכן', 'success');
    } catch (e: unknown) {
      setLeads(prevSnapshot);
      addToast(getErrorMessage(e) || 'שגיאה בעדכון ליד', 'error');
    }
  };

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leadCards.find((l) => String(l.id) === String(selectedLeadId)) || null;
  }, [leadCards, selectedLeadId]);

  const handleStatusChange = async (leadId: string, newStatus: PipelineStage) => {
    if (isSystemStage(newStatus) && newStatus === 'won') {
      addToast('סגירת עסקה (won) דורשת handover. יתווסף בהמשך.', 'info');
      return;
    }

    setIsSaving(true);
    const prevSnapshot = leads;
    setLeads((prev) => prev.map((l) => (String(l.id) === String(leadId) ? { ...l, status: newStatus } : l)));
    try {
      const res = await updateSystemLeadStatus({ orgSlug, leadId, status: newStatus });
      if (!res.ok) {
        setLeads(prevSnapshot);
        addToast(res.message || 'שגיאה בעדכון סטטוס', 'error');
        return;
      }
      setLeads((prev) => prev.map((l) => (String(l.id) === leadId ? res.lead : l)));
    } catch (e: unknown) {
      setLeads(prevSnapshot);
      addToast(getErrorMessage(e) || 'שגיאה בעדכון סטטוס', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLead = async (lead: Lead) => {
    setIsSaving(true);
    try {
      const created = await createSystemLead(orgSlug, {
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        value: lead.value,
        isHot: lead.isHot,
        productInterest: lead.productInterest,
      });
      setLeads((prev) => [created, ...prev]);
      setHasMore(true);
      addToast('ליד נוצר', 'success');
      setShowNewLeadModal(false);
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה ביצירת ליד', 'error');
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddActivity = async (leadId: string, activity: LeadActivity) => {
    setIsSaving(true);
    try {
      const res = await createSystemLeadActivity({
        orgSlug,
        leadId,
        type: String(activity.type || 'note'),
        content: String(activity.content || '').trim(),
      });

      if (!res.ok) {
        addToast(res.message || 'שגיאה בשמירת פעילות', 'error');
        return;
      }

      if (res.lead) {
        setLeads((prev) => prev.map((l) => (String(l.id) === String(leadId) ? res.lead! : l)));
      }

      addToast('נשמר', 'success');
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בשמירת פעילות', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScheduleMeeting = (leadId?: string) => {
    const url = leadId
      ? `${basePath}/calendar?leadId=${encodeURIComponent(leadId)}`
      : `${basePath}/calendar`;
    router.push(url);
  };

  const handleOpenClientPortal = (lead: Lead) => {
    const email = String(lead.email || '').trim();
    if (!email) {
      addToast('לא ניתן לפתוח פורטל לקוח כי לליד אין אימייל.', 'warning');
      return;
    }
    addToast('פתיחת פורטל לקוח תתווסף בהמשך', 'info');
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="min-w-0">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">מערכת לידים</div>
            <div className="text-xl md:text-3xl font-black text-slate-900 truncate flex items-center gap-2">
              לידים
              {!isAdmin && (
                <span className="text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">שלי</span>
              )}
            </div>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5 md:hidden">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar md:pb-0">
          <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListIcon size={18} />
            </button>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => setShowNewLeadModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-black shadow-lg shadow-slate-900/20 transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus size={14} /> חדש
          </button>

          <button
            type="button"
            onClick={handleCopyLeadFormLink}
            className={`inline-flex items-center gap-1.5 border px-3 py-2 rounded-xl text-xs font-black shadow-sm transition-all whitespace-nowrap ${
              leadFormCopied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {leadFormCopied ? <Check size={14} /> : <Link2 size={14} />}
            טופס
          </button>
          
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowImportDialog(true)}
              className="bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow-sm transition-all whitespace-nowrap"
            >
              ייבוא
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsStagesModalOpen(true);
                void refreshStages();
              }}
              className="bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-black shadow-sm transition-all whitespace-nowrap"
            >
              שלבים
            </button>
          )}
        </div>
      </div>

      {/* Lead Capture Settings Banner — admin only */}
      {isAdmin && <div className="mb-4 flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-black text-slate-500 uppercase">טופס</span>
          <button
            type="button"
            disabled={lcLoading}
            onClick={() => void handleToggleLeadCapture()}
            dir="ltr"
            className={`relative w-8 h-4.5 rounded-full p-0.5 transition-colors ${lcSettings.leadCaptureEnabled ? 'bg-emerald-500' : 'bg-slate-300'} ${lcLoading ? 'opacity-60' : ''}`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform ${lcSettings.leadCaptureEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
          </button>
        </div>
        
        {lcSettings.leadCaptureEnabled && (
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-px h-3.5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase">מייל</span>
              <button
                type="button"
                disabled={lcLoading}
                onClick={() => void handleToggleEmailNotify()}
                dir="ltr"
                className={`relative w-8 h-4.5 rounded-full p-0.5 transition-colors ${lcSettings.leadCaptureEmailNotify ? 'bg-emerald-500' : 'bg-slate-300'} ${lcLoading ? 'opacity-60' : ''}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform ${lcSettings.leadCaptureEmailNotify ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        )}
      </div>}

        <div className="grid grid-cols-1 md:flex md:flex-row gap-2 mb-4">
          <div className="flex-1 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש..."
              className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-sm focus:border-slate-900 transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setTodayOnly((v) => !v)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-black border shadow-sm transition-all whitespace-nowrap ${
                todayOnly ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
            >
              היום
            </button>
          </div>

          <div className="grid grid-cols-2 md:flex md:flex-row gap-2">
            <Select
              value={statusFilter}
              className="md:w-48 h-full min-h-[44px] rounded-2xl font-bold text-sm border-slate-200"
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') {
                  setStatusFilter('all');
                  return;
                }
                setStatusFilter(val as PipelineStage);
              }}
            >
              <option value="all">כל הסטטוסים</option>
              {stagesForUi.map((s) => (
                <option key={s.key} value={String(s.key)}>{String(s.label)}</option>
              ))}
            </Select>

            <Select
              value={sortKey}
              className="md:w-48 h-full min-h-[44px] rounded-2xl font-bold text-sm border-slate-200"
              onChange={(e) => {
                const val = e.target.value;
                if (
                  val === 'created_desc' ||
                  val === 'created_asc' ||
                  val === 'value_desc' ||
                  val === 'value_asc' ||
                  val === 'name_asc' ||
                  val === 'name_desc'
                ) {
                  setSortKey(val);
                }
              }}
            >
              <option value="created_desc">חדש ביותר</option>
              <option value="created_asc">ישן ביותר</option>
              <option value="value_desc">שווי גבוה</option>
              <option value="value_asc">שווי נמוך</option>
              <option value="name_asc">שם (א-ת)</option>
              <option value="name_desc">שם (ת-א)</option>
            </Select>
          </div>
        </div>

      <div className="h-[calc(100vh-280px)] md:h-auto md:flex-1 md:min-h-0">
        {viewMode === 'board' ? (
          <PipelineBoard
            leads={visibleLeads}
            stages={stagesForUi.map((s) => ({
              id: String(s.key),
              label: String(s.label),
              accent: String(s.accent || ''),
              color: String(s.color || ''),
            }))}
            onLeadClick={(lead) => setSelectedLeadId(String(lead.id))}
            onStatusChange={(leadId, status) => void handleStatusChange(leadId, status)}
            onUpdateFollowUp={(p) => void handleUpdateFollowUp(p)}
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
            <div className="max-h-full overflow-auto custom-scrollbar">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500">
                  <div className="col-span-3">שם</div>
                  <div className="col-span-3">חברה</div>
                  <div className="col-span-2">טלפון</div>
                  <div className="col-span-2">שווי</div>
                  <div className="col-span-2">סטטוס</div>
                </div>

                {visibleLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer relative ${
                      lead.nextActionDate
                        ? isSameLocalDay(new Date(lead.nextActionDate), new Date())
                          ? 'border-l-4 border-l-orange-500'
                          : new Date(lead.nextActionDate).getTime() < Date.now()
                            ? 'border-l-4 border-l-red-500'
                            : ''
                        : ''
                    }`}
                    onClick={() => setSelectedLeadId(String(lead.id))}
                  >
                    <div className="col-span-3 font-black text-sm text-slate-900 truncate">{lead.name}</div>
                    <div className="col-span-3 text-sm text-slate-600 truncate">{lead.company || 'לקוח פרטי'}</div>
                    <div className="col-span-2 text-sm text-slate-600" dir="ltr">
                      {lead.phone}
                    </div>
                    <div className="col-span-2 text-sm font-mono font-black text-slate-800">₪{Number(lead.value || 0).toLocaleString()}</div>
                    <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                      <CustomSelect
                        value={lead.status}
                        onChange={(val) => {
                          void handleStatusChange(String(lead.id), val);
                        }}
                        options={stagesForUi.map((s) => ({ value: String(s.key), label: String(s.label) }))}
                      />
                    </div>
                  </div>
                ))}

                {visibleLeads.length === 0 ? (
                  <div className="p-10 text-center text-sm font-bold text-slate-500">לא נמצאו לידים</div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {hasMore ? (
        <div className="pt-3 pb-2 flex justify-center">
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore}
            className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-sm shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {isLoadingMore ? 'טוען...' : 'טען עוד'}
          </button>
        </div>
      ) : null}

      {selectedLead ? (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onAddActivity={(leadId, activity) => void handleAddActivity(leadId, activity)}
          onScheduleMeeting={(leadId) => handleScheduleMeeting(String(leadId))}
          onStatusChange={(id, status) => void handleStatusChange(String(id), status)}
          onOpenClientPortal={() => handleOpenClientPortal(selectedLead)}
          assignees={assignees}
          onUpdateLead={(p) => void handleUpdateLead(p)}
          onAddTask={undefined}
        />
      ) : null}

      {showNewLeadModal ? (
        <NewLeadModal
          onClose={() => (isSaving ? null : setShowNewLeadModal(false))}
          onSave={(lead) => handleCreateLead(lead)}
        />
      ) : null}

      <SmartImportLeadsDialog
        orgSlug={orgSlug}
        open={showImportDialog}
        onCloseAction={() => setShowImportDialog(false)}
        onImportedAction={(r) => {
          addToast(`ייבוא הושלם: ${r.created} לידים`, 'success');
          setShowImportDialog(false);
          void refreshFirstPage();
        }}
      />

      {isStagesModalOpen ? (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setIsStagesModalOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90dvh] bg-white rounded-t-3xl md:rounded-3xl border border-slate-200 shadow-2xl p-4 md:p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-lg font-black text-slate-900">ניהול שלבי מכירה</div>
                <div className="text-xs font-bold text-slate-500">השלבים משפיעים מיידית על לוח הלידים</div>
              </div>
              <button
                type="button"
                onClick={() => setIsStagesModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
              >
                סגור
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
              <input
                value={newStageKey}
                onChange={(e) => setNewStageKey(e.target.value)}
                placeholder="מזהה (למשל: מתעניין)"
                className="md:col-span-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
              />
              <input
                value={newStageLabel}
                onChange={(e) => setNewStageLabel(e.target.value)}
                placeholder="שם שלב (למשל: מתעניין)"
                className="md:col-span-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
              />
              <button
                type="button"
                onClick={() => void handleCreateStage()}
                disabled={isStagesSaving}
                className="bg-slate-900 text-white rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-60"
              >
                הוסף
              </button>
            </div>

            {stageError ? (
              <div className="mb-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
                {stageError}
              </div>
            ) : null}

            {deleteConfirm ? (
              <div className="mb-3 px-4 py-4 rounded-2xl bg-amber-50 border-2 border-amber-200">
                <div className="text-sm font-black text-amber-900 mb-2">
                  בשלב &quot;{deleteConfirm.stageLabel}&quot; יש {deleteConfirm.leadCount} לידים
                </div>
                <div className="text-xs font-bold text-amber-700 mb-3">בחר שלב להעביר אותם אליו לפני המחיקה:</div>
                <select
                  value={deleteConfirm.moveToKey}
                  onChange={(e) => setDeleteConfirm((prev) => prev ? { ...prev, moveToKey: e.target.value } : null)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold mb-3"
                >
                  <option value="">— בחר שלב יעד —</option>
                  {(pipelineStages || [])
                    .filter((s) => String(s.key) !== deleteConfirm.stageKey)
                    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
                    .map((s) => (
                      <option key={String(s.id)} value={String(s.key)}>{String(s.label || s.key)}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isStagesSaving || !deleteConfirm.moveToKey}
                    onClick={() => void handleConfirmDeleteWithMove()}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-black disabled:opacity-60"
                  >
                    {isStagesSaving ? 'מוחק...' : 'מחק והעבר לידים'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteConfirm(null); setStageError(null); }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {(pipelineStages || [])
                .slice()
                .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
                .map((s) => (
                <div key={String(s.id)} className="border border-slate-200 rounded-2xl p-3 bg-white">
                  <div className="flex items-center justify-between gap-2 mb-2 md:mb-0">
                    <div className="text-[11px] font-black text-slate-500">
                      {String(s.label || s.key)}
                    </div>
                    <button
                      type="button"
                      disabled={isStagesSaving}
                      onClick={() => void handleDeleteStage(String(s.id))}
                      className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-black disabled:opacity-60 md:hidden"
                    >
                      מחק
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-[1fr_80px_120px_auto] gap-2">
                    <input
                      defaultValue={String(s.label || '')}
                      onBlur={(e) => void handleUpdateStage(String(s.id), { label: e.target.value })}
                      className="col-span-2 md:col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
                      placeholder="שם שלב"
                    />
                    <input
                      defaultValue={String(s.order ?? 0)}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        void handleUpdateStage(String(s.id), { order: Number.isFinite(v) ? v : 0 });
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
                      dir="ltr"
                      placeholder="סדר"
                    />
                    <input
                      defaultValue={String(s.accent || '')}
                      onBlur={(e) => void handleUpdateStage(String(s.id), { accent: e.target.value || null })}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
                      dir="ltr"
                      placeholder="צבע"
                    />
                    <button
                      type="button"
                      disabled={isStagesSaving}
                      onClick={() => void handleDeleteStage(String(s.id))}
                      className="hidden md:block px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-black disabled:opacity-60"
                    >
                      מחק
                    </button>
                  </div>
                </div>
              ))}
              {(pipelineStages || []).length === 0 ? (
                <div className="text-sm font-bold text-slate-500">אין עדיין שלבים. הוסף שלב ראשון.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
