'use client';

import React, { useState, useCallback, useTransition } from 'react';
import {
  FileInput, Plus, Trash2, Layout, ToggleLeft, ToggleRight, X
} from 'lucide-react';
import type { SystemFormDTO } from '@/app/actions/system-forms';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  ONBOARDING: { label: 'אונבורדינג', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  FEEDBACK: { label: 'פידבק', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  STRATEGY: { label: 'אסטרטגיה', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  INTAKE: { label: 'קליטה', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  SURVEY: { label: 'סקר', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

interface FormsViewProps {
  initialForms: SystemFormDTO[];
  orgSlug: string;
  createFormAction: (orgSlug: string, data: { title: string; description?: string; category?: string }) => Promise<{ id?: string; error?: string }>;
  toggleActiveAction: (orgSlug: string, formId: string, isActive: boolean) => Promise<{ error?: string }>;
  deleteFormAction: (orgSlug: string, formId: string) => Promise<{ error?: string }>;
}

const FormsView: React.FC<FormsViewProps> = ({
  initialForms, orgSlug, createFormAction, toggleActiveAction, deleteFormAction,
}) => {
  const [forms, setForms] = useState<SystemFormDTO[]>(initialForms);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('ONBOARDING');

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const result = await createFormAction(orgSlug, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
      });
      if (result.id) {
        setForms((prev) => [{
          id: result.id!,
          title: newTitle.trim(),
          description: newDesc.trim(),
          category: newCategory,
          is_active: true,
          created_at: new Date().toISOString(),
          responses_count: 0,
          steps_count: 0,
        }, ...prev]);
        setNewTitle(''); setNewDesc(''); setNewCategory('ONBOARDING'); setShowCreate(false);
      }
    });
  }, [newTitle, newDesc, newCategory, orgSlug, createFormAction]);

  const handleToggle = useCallback(async (formId: string, currentActive: boolean) => {
    startTransition(async () => {
      const result = await toggleActiveAction(orgSlug, formId, !currentActive);
      if (!result.error) {
        setForms((prev) => prev.map((f) => f.id === formId ? { ...f, is_active: !currentActive } : f));
      }
    });
  }, [orgSlug, toggleActiveAction]);

  const handleDelete = useCallback(async (formId: string) => {
    startTransition(async () => {
      const result = await deleteFormAction(orgSlug, formId);
      if (!result.error) {
        setForms((prev) => prev.filter((f) => f.id !== formId));
      }
    });
  }, [orgSlug, deleteFormAction]);

  const activeForms = forms.filter((f) => f.is_active).length;
  const totalResponses = forms.reduce((s, f) => s + f.responses_count, 0);

  return (
    <div className="flex-1 flex flex-col max-w-[1920px] mx-auto animate-fade-in pb-24 min-h-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <FileInput className="text-violet-500" strokeWidth={2.5} size={28} />
            טפסים
          </h2>
          <p className="text-sm text-slate-500 mt-1">{forms.length} טפסים • {activeForms} פעילים • {totalResponses} תגובות</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all flex items-center gap-2" type="button">
          <Plus size={16} /> טופס חדש
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
          <p className="text-2xl font-black text-violet-600">{forms.length}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">סה״כ טפסים</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <p className="text-2xl font-black text-emerald-600">{activeForms}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">פעילים</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-2xl font-black text-blue-600">{totalResponses}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">תגובות</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-2xl font-black text-amber-600">{forms.reduce((s, f) => s + f.steps_count, 0)}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">שלבים</p>
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">טופס חדש</h3>
              <button onClick={() => setShowCreate(false)} type="button" className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="שם הטופס *" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
              <input type="text" placeholder="תיאור (אופציונלי)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none">
                <option value="ONBOARDING">אונבורדינג</option>
                <option value="FEEDBACK">פידבק</option>
                <option value="STRATEGY">אסטרטגיה</option>
                <option value="INTAKE">קליטה</option>
                <option value="SURVEY">סקר</option>
              </select>
              <button onClick={handleCreate} disabled={!newTitle.trim() || isPending} type="button" className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50">
                {isPending ? 'יוצר...' : 'צור טופס'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forms List */}
      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-20 h-20 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-6">
            <FileInput size={36} className="text-violet-400" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">אין טפסים עדיין</h3>
          <p className="text-slate-500 text-sm max-w-md mb-6">צור את הטופס הראשון שלך כדי להתחיל לאסוף לידים ופניות</p>
          <button onClick={() => setShowCreate(true)} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all flex items-center gap-2" type="button">
            <Plus size={16} /> צור טופס ראשון
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form) => {
            const cat = CATEGORY_LABELS[form.category] || { label: form.category, color: 'text-slate-600 bg-slate-50 border-slate-200' };
            return (
              <div key={form.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${form.is_active ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Layout size={20} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${cat.color}`}>{cat.label}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${form.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {form.is_active ? 'פעיל' : 'מושבת'}
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-slate-800 text-base mb-1">{form.title}</h3>
                {form.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{form.description}</p>}

                <div className="mt-auto pt-4 border-t border-slate-50 grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">תגובות</div>
                    <div className="text-lg font-black text-slate-700">{form.responses_count}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">שלבים</div>
                    <div className="text-lg font-black text-slate-700">{form.steps_count}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(form.id, form.is_active)}
                    type="button"
                    className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${form.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    {form.is_active ? <><ToggleRight size={14} /> השבת</> : <><ToggleLeft size={14} /> הפעל</>}
                  </button>
                  <button onClick={() => handleDelete(form.id)} type="button" className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={() => setShowCreate(true)} type="button" className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50/30 transition-all min-h-[250px] group">
            <div className="w-14 h-14 rounded-full bg-slate-50 group-hover:bg-white border border-slate-200 flex items-center justify-center mb-4 transition-colors shadow-sm">
              <Plus size={28} />
            </div>
            <span className="font-bold">צור טופס חדש</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FormsView;
