'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Copy, Plus, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { createOrganizationOrInviteOwner } from '@/app/actions/admin-organizations';

export default function AdminOrganizationsClient(props: {
  orgs: any[];
}) {
  const router = useRouter();
  const { addToast } = useData();

  const orgs = Array.isArray(props.orgs) ? props.orgs : [];

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setSlug('');
    setOwnerEmail('');
  };

  const canSubmit = useMemo(() => {
    return Boolean(name.trim() && slug.trim() && ownerEmail.trim() && ownerEmail.includes('@'));
  }, [name, slug, ownerEmail]);

  const onSubmit = () => {
    if (!canSubmit) return;

    startTransition(async () => {
      try {
        const res: any = await createOrganizationOrInviteOwner({
          name: name.trim(),
          slug: slug.trim(),
          ownerEmail: ownerEmail.trim(),
        });

        if (!res?.success) {
          addToast(res?.error || 'שגיאה', 'error');
          return;
        }

        const kind = res?.data?.kind as 'organization' | 'invitation' | undefined;

        if (kind === 'organization') {
          addToast('הארגון נוצר ושויך לבעלים', 'success');
          setLastInviteUrl(null);
        } else if (kind === 'invitation') {
          const url = String(res?.data?.signupUrl || '');
          setLastInviteUrl(url || null);
          addToast('נוצרה הזמנה ונשלח מייל לבעלים (אם המייל מוגדר)', 'success');
        } else {
          addToast('הפעולה הושלמה', 'success');
        }

        setIsOpen(false);
        resetForm();
        router.refresh();
      } catch (e: any) {
        addToast(e?.message || 'שגיאה', 'error');
      }
    });
  };

  const copyInvite = async () => {
    if (!lastInviteUrl) return;
    try {
      await navigator.clipboard.writeText(lastInviteUrl);
      addToast('הקישור הועתק ללוח', 'success');
    } catch {
      addToast('שגיאה בהעתקת הקישור', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-black text-slate-900">ארגונים</div>
          <div className="text-sm font-bold text-slate-500 mt-1">ניהול ארגונים גלובלי</div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-white font-black shadow-sm hover:bg-indigo-500 transition"
        >
          <Plus size={18} />
          הוסף ארגון
        </button>
      </div>

      {lastInviteUrl ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-500">קישור הרשמה (Invite)</div>
            <div className="text-sm font-bold text-slate-900 truncate" dir="ltr">
              {lastInviteUrl}
            </div>
          </div>
          <button
            type="button"
            onClick={copyInvite}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-white font-black hover:bg-slate-800 transition"
          >
            <Copy size={16} />
            העתק
          </button>
        </div>
      ) : null}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-black text-slate-600">שם</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">Slug</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">בעלים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">חברים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">מודולים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.map((o: any) => {
                const mods = [
                  o?.has_nexus ? 'nexus' : null,
                  o?.has_system ? 'system' : null,
                  o?.has_social ? 'social' : null,
                  o?.has_finance ? 'finance' : null,
                  o?.has_client ? 'client' : null,
                  o?.has_operations ? 'operations' : null,
                ].filter(Boolean);

                const ownerName = o?.owner?.full_name || o?.owner?.email || o?.owner_id || '';

                return (
                  <tr key={String(o.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{o.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{o.slug || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{ownerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{Number(o.membersCount ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{mods.length ? mods.join(', ') : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="close"
            onClick={() => (!isPending ? setIsOpen(false) : null)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Building2 size={18} className="text-indigo-700" />
                </div>
                <div className="text-lg font-black text-slate-900">הוספת ארגון</div>
              </div>

              <button
                type="button"
                onClick={() => (!isPending ? setIsOpen(false) : null)}
                className="p-2 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={18} className="text-slate-700" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">שם הארגון</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder={'לדוגמה: Acme בע"מ'}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">Slug רצוי</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="לדוגמה: acme"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">אימייל הבעלים</label>
                <input
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="owner@acme.com"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isPending) return;
                  setIsOpen(false);
                }}
                className="rounded-2xl bg-slate-100 px-5 py-2.5 text-slate-800 font-black hover:bg-slate-200 transition"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={!canSubmit || isPending}
                onClick={onSubmit}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-white font-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isPending ? 'שומר…' : 'צור ארגון / שלח הזמנה'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
