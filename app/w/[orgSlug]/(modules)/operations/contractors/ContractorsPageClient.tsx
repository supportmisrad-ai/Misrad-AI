'use client';

import React, { useState } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { Users, Package } from 'lucide-react';
import ContractorPortalLinkCopy from '@/components/operations/ContractorPortalLinkCopy';
import type { OperationsSupplierRow } from '@/app/actions/operations';

interface ContractorsPageClientProps {
  error: string | null;
  newToken: string | null;
  newTokenLabel: string | null;
  suppliers: OperationsSupplierRow[];
  initialTab?: 'contractors' | 'suppliers';
  createTokenAction: (formData: FormData) => Promise<void>;
  addSupplierAction: (formData: FormData) => Promise<void>;
  deleteSupplierAction: (formData: FormData) => Promise<void>;
}

const inputCls = 'flex-1 h-10 rounded-lg border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100 placeholder:text-slate-400';
const btnAddCls = 'shrink-0 h-10 inline-flex items-center justify-center rounded-lg px-4 text-sm font-bold bg-sky-500 text-white hover:bg-sky-600 shadow-sm transition-all duration-150';
const btnDelCls = 'shrink-0 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200/60 shadow-sm hover:bg-rose-50 hover:border-rose-300 transition-all duration-150';
const cardCls = 'rounded-xl border border-slate-200/60 bg-white p-4';
const rowCls = 'flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-2.5';
const sectionTitleCls = 'text-xs font-semibold text-slate-600';

export default function ContractorsPageClient({
  error,
  newToken,
  newTokenLabel,
  suppliers,
  initialTab,
  createTokenAction,
  addSupplierAction,
  deleteSupplierAction,
}: ContractorsPageClientProps) {
  const [activeTab, setActiveTab] = useState<'contractors' | 'suppliers'>(initialTab || 'contractors');
  const [ttl, setTtl] = useState('72');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('contractors')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all duration-150 border-b-2 ${
            activeTab === 'contractors'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={18} />
          קבלנים (פורטל)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all duration-150 border-b-2 ${
            activeTab === 'suppliers'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package size={18} />
          ספקים
        </button>
      </div>

      {/* Contractors Tab */}
      {activeTab === 'contractors' ? (
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="text-sm font-bold text-slate-800">פורטל קבלנים</div>
            <div className="text-xs text-slate-400 mt-0.5">שלח לקבלן קישור אישי — הוא יראה רק את המשימות שלו</div>
          </div>

          <div className="p-5 space-y-5">
            {/* How it works */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
              <div className="text-xs font-bold text-sky-800 mb-3">איך זה עובד?</div>
              <ol className="space-y-2 text-sm text-slate-700 list-none">
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-black">1</span>
                  <span><strong>צור טוקן</strong> — הכנס שם קבלן ובחר תוקף (ברירת מחדל 72 שעות)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-black">2</span>
                  <span><strong>העתק את הקישור</strong> שנוצר ושלח אותו לקבלן (וואטסאפ, SMS, מייל)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-black">3</span>
                  <span><strong>הקבלן פותח את הקישור</strong> — רואה את הקריאות, מצלם, חותם ומעדכן סטטוס. בלי התקנה, בלי סיסמה.</span>
                </li>
              </ol>
            </div>

            {/* Create token form */}
            <div className={cardCls}>
              <div className={sectionTitleCls}>צור קישור חדש לקבלן</div>
              <form action={createTokenAction} className="mt-3 flex flex-wrap gap-2">
                <input name="label" placeholder="שם הקבלן (לזיהוי)" className={inputCls} />
                <input type="hidden" name="ttl" value={ttl} />
                <div className="max-w-[160px]">
                  <CustomSelect
                    value={ttl}
                    onChange={(val) => setTtl(val)}
                    options={[
                      { value: '24', label: '24 שעות' },
                      { value: '72', label: '3 ימים' },
                      { value: '168', label: 'שבוע' },
                      { value: '720', label: 'חודש' },
                    ]}
                  />
                </div>
                <button type="submit" className={btnAddCls}>צור קישור</button>
              </form>
            </div>

            {/* Display generated link */}
            {newToken ? (
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                <div className="text-xs font-bold text-emerald-800 mb-1">הקישור מוכן{newTokenLabel ? ` עבור ${newTokenLabel}` : ''}!</div>
                <div className="text-[11px] text-emerald-700 mb-3">העתק ושלח לקבלן. הקישור חד-פעמי ופג תוקף אוטומטית.</div>
                <ContractorPortalLinkCopy token={newToken} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' ? (
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="text-sm font-bold text-slate-800">ניהול ספקים</div>
            <div className="text-xs text-slate-400 mt-0.5">ספקי חומרים, שירותים וציוד — ניתן לשייך ספק לפריטי מלאי</div>
          </div>

          <div className="p-5 space-y-4">
            <div className={cardCls}>
              <div className={sectionTitleCls}>הוסף ספק חדש</div>
              <form action={addSupplierAction} className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input name="name" placeholder="שם הספק *" required className={inputCls} />
                  <input name="contactName" placeholder="איש קשר" className={inputCls} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <input name="phone" type="tel" placeholder="טלפון" className={`${inputCls} max-w-[200px]`} />
                  <input name="email" type="email" placeholder="אימייל" className={`${inputCls} max-w-[240px]`} />
                  <input name="notes" placeholder="הערות" className={inputCls} />
                  <button type="submit" className={btnAddCls}>הוסף ספק</button>
                </div>
              </form>
            </div>

            <div className="space-y-2">
              {suppliers.length ? suppliers.map((s) => (
                <div key={s.id} className={rowCls}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 truncate">{s.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                      {s.contactName ? <span>{s.contactName}</span> : null}
                      {s.phone ? <span dir="ltr">{s.phone}</span> : null}
                      {s.email ? <span dir="ltr">{s.email}</span> : null}
                      {s.notes ? <span className="text-slate-400">{s.notes}</span> : null}
                    </div>
                  </div>
                  <form action={deleteSupplierAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className={btnDelCls}>מחק</button>
                  </form>
                </div>
              )) : <div className="text-sm text-slate-500">אין עדיין ספקים</div>}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
