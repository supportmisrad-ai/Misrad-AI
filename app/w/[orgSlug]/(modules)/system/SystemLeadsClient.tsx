'use client';

import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import NewLeadModal from '@/components/system/NewLeadModal';
import { Lead } from '@/components/system/types';
import { createSystemLead, SystemLeadDTO, updateSystemLeadStatus } from '@/app/actions/system-leads';

function dtoToLead(dto: SystemLeadDTO): Lead {
  return {
    id: dto.id,
    name: dto.name,
    company: dto.company ?? undefined,
    phone: dto.phone,
    email: dto.email ?? '',
    source: dto.source,
    status: dto.status as any,
    value: dto.value,
    lastContact: new Date(dto.last_contact),
    createdAt: new Date(dto.created_at),
    activities: [],
    isHot: dto.is_hot,
    assignedAgentId: dto.assigned_agent_id ?? undefined,
    productInterest: (dto as any).productInterest,
    score: dto.score,
  };
}

export default function SystemLeadsClient({
  orgSlug,
  initialLeads,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
}) {
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [leads, setLeads] = useState<SystemLeadDTO[]>(initialLeads);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const leadCards = useMemo(() => leads.map(dtoToLead), [leads]);

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
    } catch (e: any) {
      setMessage(e?.message || 'שגיאה בסגירת ליד');
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
          <div key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4">
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
    </div>
  );
}
