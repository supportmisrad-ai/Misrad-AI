'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import NewLeadModal from '@/components/system/NewLeadModal';
import { Lead } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { createSystemLead, SystemLeadDTO, updateSystemLeadStatus } from '@/app/actions/system-leads';
import { getErrorMessage } from '@/lib/shared/unknown';

export default function SystemLeadsClient({
  orgSlug,
  initialLeads,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
}) {
  const searchParams = useSearchParams();
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [leads, setLeads] = useState<SystemLeadDTO[]>(initialLeads);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const leadRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [deepLinkedLeadId, setDeepLinkedLeadId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const leadCards = useMemo(() => leads.map(mapDtoToLead), [leads]);

  useEffect(() => {
    const leadId = searchParams?.get('leadId');
    if (!leadId) return;
    setDeepLinkedLeadId(String(leadId));
    setSelectedLeadId(String(leadId));
  }, [searchParams]);

  useEffect(() => {
    if (!deepLinkedLeadId) return;
    const el = leadRefs.current[String(deepLinkedLeadId)];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [deepLinkedLeadId, leads.length]);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => String(l.id) === String(selectedLeadId)) || null;
  }, [leads, selectedLeadId]);

  const handleCreateLead = async (input: {
    name: string;
    company?: string;
    phone: string;
    email: string;
    source?: string;
    value?: number;
    isHot?: boolean;
    productInterest?: string;
  }) => {
    setIsSaving(true);
    try {
      const created = await createSystemLead(orgSlug, input);
      setLeads(prev => [created, ...prev]);
      setShowNewLeadModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkWon = async (leadId: string) => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await updateSystemLeadStatus({ orgSlug, leadId, status: 'won' });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setLeads(prev => prev.map(l => (l.id === leadId ? res.lead : l)));
      setMessage('הליד נסגר בהצלחה ונפתח לקוח בפורטל.');
    } catch (e: unknown) {
      setMessage(getErrorMessage(e) || 'שגיאה בסגירת ליד');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">System</h1>
          <p className="text-slate-600 text-sm">ניהול לידים (Workspace-aware)</p>
        </div>
        <button
          onClick={() => setShowNewLeadModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2"
        >
          <Plus size={16} /> ליד חדש
        </button>
      </div>

      {message && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {leadCards.map(l => (
          <div
            key={l.id}
            ref={(el) => {
              leadRefs.current[String(l.id)] = el;
            }}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-slate-900">{l.name}</div>
              {l.isHot && <div className="text-[10px] font-bold px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-100">חם</div>}
            </div>
            <div className="text-sm text-slate-600">{l.company || 'לקוח פרטי'}</div>
            <div className="mt-3 text-xs text-slate-500" dir="ltr">
              {l.phone} · {l.email}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">{l.source}</div>
              <div className="text-xs font-mono font-bold text-slate-700">₪{l.value.toLocaleString()}</div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeadId(String(l.id))}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                פרטים
              </button>
              <button
                onClick={() => void handleMarkWon(l.id)}
                disabled={isSaving || l.status === 'won'}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  isSaving || l.status === 'won'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                סגירה (Won)
              </button>
            </div>
          </div>
        ))}
        {leadCards.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-slate-600">
            אין עדיין לידים ל־workspace הזה.
          </div>
        )}
      </div>

      {showNewLeadModal && (
        <NewLeadModal
          onClose={() => (isSaving ? null : setShowNewLeadModal(false))}
          onSave={(lead) => {
            void handleCreateLead({
              name: lead.name,
              company: lead.company,
              phone: lead.phone,
              email: lead.email,
              source: lead.source,
              value: lead.value,
              isHot: lead.isHot,
              productInterest: lead.productInterest,
            });
          }}
        />
      )}

      {selectedLead ? (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedLeadId(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black text-slate-900 truncate">{selectedLead.name}</div>
                <div className="text-sm text-slate-500 mt-1">{selectedLead.company || 'לקוח פרטי'}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadId(null)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
              >
                סגור
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500">סטטוס</div>
                <div className="mt-1 font-bold text-slate-900">{String(selectedLead.status || '')}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-xs font-bold text-slate-500">שווי</div>
                <div className="mt-1 font-bold text-slate-900">₪{Number(selectedLead.value || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4" dir="ltr">
                <div className="text-xs font-bold text-slate-500" dir="rtl">טלפון</div>
                <div className="mt-1 font-bold text-slate-900">{String(selectedLead.phone || '')}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4" dir="ltr">
                <div className="text-xs font-bold text-slate-500" dir="rtl">אימייל</div>
                <div className="mt-1 font-bold text-slate-900 break-all">{String(selectedLead.email || '')}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
