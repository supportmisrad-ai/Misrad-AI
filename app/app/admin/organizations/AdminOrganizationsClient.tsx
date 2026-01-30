'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Copy, Plus, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { createOrganizationOrInviteOwner } from '@/app/actions/admin-organizations';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <div className="space-y-6 pb-24">
      <AdminPageHeader title="ארגונים" subtitle="ניהול ארגונים גלובלי" icon={Building2} />

      <AdminToolbar
        actions={
          <Button onClick={() => setIsOpen(true)}>
            <Plus size={18} />
            הוסף ארגון
          </Button>
        }
      />

      {lastInviteUrl ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-500">קישור הרשמה (Invite)</div>
            <div className="text-sm font-bold text-slate-900 truncate" dir="ltr">
              {lastInviteUrl}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={copyInvite} className="shrink-0">
            <Copy size={16} />
            העתק
          </Button>
        </div>
      ) : null}

      <div className="md:hidden">
        {orgs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-600">אין ארגונים להצגה</div>
        ) : (
          <div className="space-y-3">
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
                <div key={String(o.id)} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-sm font-black text-slate-900 truncate">{String(o.name || '')}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">slug: {o.slug || '-'}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">בעלים: {ownerName || '-'}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">חברים: {Number(o.membersCount ?? 0)}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">מודולים: {mods.length ? mods.join(', ') : '-'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
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
          <Button
            type="button"
            variant="ghost"
            className="absolute inset-0 w-full h-full p-0 bg-black/40 rounded-none"
            aria-label="close"
            onClick={() => (!isPending ? setIsOpen(false) : null)}
          />

          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Building2 size={18} className="text-indigo-700" />
                </div>
                <div className="text-lg font-black text-slate-900">הוספת ארגון</div>
              </div>

              <Button
                type="button"
                onClick={() => (!isPending ? setIsOpen(false) : null)}
                variant="ghost"
                size="icon"
                className="h-11 w-11"
              >
                <X size={18} className="text-slate-700" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">שם הארגון</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="שם הארגון"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">Slug</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="slug"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">אימייל בעלים</label>
                <Input
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@email.com"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200">
              <div className="pt-2 flex gap-2">
                <Button disabled={!canSubmit || isPending} onClick={onSubmit} className="flex-1">
                  <Plus size={18} />
                  צור
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (!isPending ? setIsOpen(false) : null)}
                  className="px-4"
                >
                  ביטול
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
