'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Share2, Copy, Check, LinkIcon, Users, Flame, TrendingUp, FileUp, Globe } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import NewLeadModal from '@/components/system/NewLeadModal';
import SmartImportLeadsDialog from '@/components/system/SmartImportLeadsDialog';
import { Lead } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { createSystemLead, getSystemLeadsPage, SystemLeadDTO, updateSystemLeadStatus } from '@/app/actions/system-leads';
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInline, setCopiedInline] = useState(false);

  const formUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/lead/${orgSlug}`
    : `/lead/${orgSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyInline = () => {
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopiedInline(true);
      setTimeout(() => setCopiedInline(false), 2500);
    });
  };

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
    console.log('[SystemLeadsClient] handleCreateLead called with:', input);
    setIsSaving(true);
    setMessage(null);
    try {
      console.log('[SystemLeadsClient] Calling createSystemLead...');
      const created = await createSystemLead(orgSlug, input);
      console.log('[SystemLeadsClient] createSystemLead returned:', created);
      setLeads(prev => [created, ...prev]);
      setShowNewLeadModal(false);
      setMessage('הליד נוצר בהצלחה');
    } catch (e: unknown) {
      console.error('[SystemLeadsClient] Error in createSystemLead:', e);
      const errMsg = getErrorMessage(e);
      setMessage(errMsg || 'שגיאה ביצירת הליד');
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const refreshLeads = async () => {
    const res = await getSystemLeadsPage({ orgSlug, pageSize: 200 });
    if (!res.success) {
      setMessage(res.error || 'שגיאה בטעינת לידים');
      return;
    }
    setLeads(res.data.leads);
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

  const hotCount = leadCards.filter(l => l.isHot).length;
  const wonCount = leadCards.filter(l => l.status === 'won').length;

  return (
    <div className="p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-indigo-600" size={28} strokeWidth={2.5} />
            לידים
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {leadCards.length} לידים{hotCount > 0 ? ` · ${hotCount} חמים` : ''}{wonCount > 0 ? ` · ${wonCount} נסגרו` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyInline}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${
              copiedInline
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
            type="button"
            title={formUrl}
          >
            {copiedInline ? <><Check size={15} /> הועתק!</> : <><LinkIcon size={15} /> העתק לינק</>}
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
            type="button"
          >
            <Share2 size={15} /> שתף טופס
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            type="button"
          >
            <FileUp size={15} /> ייבוא
          </button>
          <button
            onClick={() => setShowNewLeadModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2"
            type="button"
          >
            <Plus size={16} /> ליד חדש
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      {leadCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <div className="text-xs font-bold text-slate-500 mb-1">סה&quot;כ לידים</div>
            <div className="text-2xl font-black text-slate-900">{leadCards.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Flame size={12} className="text-rose-500" /> חמים</div>
            <div className="text-2xl font-black text-rose-600">{hotCount}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><TrendingUp size={12} className="text-emerald-500" /> נסגרו</div>
            <div className="text-2xl font-black text-emerald-600">{wonCount}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <div className="text-xs font-bold text-slate-500 mb-1">שווי כולל</div>
            <div className="text-2xl font-black text-slate-900">₪{leadCards.reduce((s, l) => s + Number(l.value || 0), 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {message}
        </div>
      )}

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {leadCards.map(l => (
          <div
            key={l.id}
            ref={(el) => {
              leadRefs.current[String(l.id)] = el;
            }}
            onClick={() => setSelectedLeadId(String(l.id))}
            className={`rounded-2xl border bg-white p-5 cursor-pointer transition-all hover:shadow-md hover:border-slate-300 ${
              String(selectedLeadId) === String(l.id) ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200/70'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                  {l.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{l.name}</div>
                  <div className="text-xs text-slate-500 truncate">{l.company || 'לקוח פרטי'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {l.isHot && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1">
                    <Flame size={10} /> חם
                  </span>
                )}
                {l.status === 'won' && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                    נסגר
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1" dir="ltr">
              <div>{l.phone}</div>
              {l.email && <div className="truncate">{l.email}</div>}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              {l.source === 'lead-form' ? (
                <span className="text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded-lg flex items-center gap-1 w-fit">
                  <Globe size={10} /> טופס ציבורי
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">{l.source}</span>
              )}
              {Number(l.value) > 0 && (
                <span className="text-sm font-black text-slate-900">₪{Number(l.value).toLocaleString()}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {leadCards.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">אין עדיין לידים</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            הוסף לידים ידנית, ייבא מאקסל, או שתף את טופס הלידים שלך כדי להתחיל לקבל פניות.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => setShowNewLeadModal(true)}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2"
              type="button"
            >
              <Plus size={16} /> ליד חדש
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
              type="button"
            >
              <FileUp size={16} /> ייבוא מאקסל
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
              type="button"
            >
              <Share2 size={16} /> שתף טופס
            </button>
          </div>
        </div>
      )}

      {showNewLeadModal && (
        <NewLeadModal
          onClose={() => (isSaving ? null : setShowNewLeadModal(false))}
          onSave={(lead) =>
            handleCreateLead({
              name: lead.name,
              company: lead.company,
              phone: lead.phone,
              email: lead.email,
              source: lead.source,
              value: lead.value,
              isHot: lead.isHot,
              productInterest: lead.productInterest,
            })
          }
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

      {/* Share Form Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <LinkIcon size={22} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">שתף טופס לידים</h3>
                <p className="text-xs text-slate-500">שלח את הלינק ללקוחות או שתף ברשתות</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex items-center gap-2">
              <input
                type="text"
                value={formUrl}
                readOnly
                dir="ltr"
                className="flex-1 bg-transparent text-sm text-slate-700 font-mono outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? <><Check size={14} /> הועתק!</> : <><Copy size={14} /> העתק</>}
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500 space-y-1">
              <p>כל מי שפותח את הלינק יוכל להשאיר פרטים.</p>
              <p>הלידים ייכנסו ישירות למערכת — בלי צורך בהגדרות נוספות.</p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      <SmartImportLeadsDialog
        orgSlug={orgSlug}
        open={showImportDialog}
        onCloseAction={() => setShowImportDialog(false)}
        onImportedAction={() => {
          setShowImportDialog(false);
          void refreshLeads();
        }}
      />
    </div>
  );
}
