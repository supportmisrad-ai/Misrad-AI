'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Copy, Plus, X, Check } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { createOrganizationOrInviteOwner } from '@/app/actions/admin-organizations';
import type { OrganizationWithOwner } from '@/app/actions/admin-organizations';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateOrgSlug } from '@/lib/shared/orgSlug';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
import type { PackageType } from '@/lib/billing/pricing';

const PACKAGE_OPTIONS: { key: PackageType; label: string; emoji: string }[] = [
  { key: 'solo', label: 'מודול בודד', emoji: '🎯' },
  { key: 'the_closer', label: 'מכירות', emoji: '💼' },
  { key: 'the_authority', label: 'שיווק ומיתוג', emoji: '🎨' },
  { key: 'the_operator', label: 'תפעול ושטח', emoji: '🔧' },
  { key: 'the_empire', label: 'הכל כלול', emoji: '👑' },
];

type CreateOrganizationOrInviteOwnerResult = Awaited<ReturnType<typeof createOrganizationOrInviteOwner>>;

const MODULE_LABELS: Record<string, string> = {
  nexus: 'נקסוס',
  system: 'מערכת',
  social: 'סושיאל',
  finance: 'פיננסים',
  client: 'לקוחות',
  operations: 'תפעול',
};

export default function AdminOrganizationsClient(props: {
  orgs: OrganizationWithOwner[];
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const { addToast } = useData();

  const orgs = Array.isArray(props.orgs) ? props.orgs : [];

  const [isOpen, setIsOpen] = useState(Boolean(props.initialOpen));
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | ''>('');

  const selectedModules = useMemo(() => {
    if (!selectedPackage) return [];
    const def = BILLING_PACKAGES[selectedPackage];
    if (!def) return [];
    return [...def.modules];
  }, [selectedPackage]);

  const resetForm = () => {
    setName('');
    setSlug('');
    setOwnerEmail('');
    setSlugTouched(false);
    setSelectedPackage('');
  };

  const onNameChange = (nextName: string) => {
    setName(nextName);
    if (!slugTouched) {
      setSlug(generateOrgSlug(nextName));
    }
  };

  const canSubmit = useMemo(() => {
    return Boolean(name.trim() && slug.trim() && ownerEmail.trim() && ownerEmail.includes('@'));
  }, [name, slug, ownerEmail]);

  const onSubmit = () => {
    if (!canSubmit) return;

    startTransition(async () => {
      try {
        const res: CreateOrganizationOrInviteOwnerResult = await createOrganizationOrInviteOwner({
          name: name.trim(),
          slug: slug.trim(),
          ownerEmail: ownerEmail.trim(),
          packageType: selectedPackage || null,
          modules: selectedModules.length > 0 ? selectedModules : null,
        });

        if (!res?.success) {
          addToast(res?.error || 'שגיאה', 'error');
          return;
        }

        const kind = res.data.kind;

        if (kind === 'organization') {
          addToast('הלקוח והארגון נוצרו בהצלחה', 'success');
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'שגיאה';
        addToast(msg, 'error');
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
      <AdminPageHeader title="ארגונים" subtitle="ניהול ארגונים ולקוחות" icon={Building2} />

      <AdminToolbar
        actions={
          <Button
            onClick={() => {
              setIsOpen(true);
              setSlugTouched(false);
              if (!slugTouched && name.trim()) {
                setSlug(generateOrgSlug(name));
              }
            }}
          >
            <Plus size={18} />
            הוסף לקוח חדש
          </Button>
        }
      />

      {lastInviteUrl ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-500">קישור הרשמה</div>
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
            {orgs.map((o) => {
              const mods = [
                o?.has_nexus ? 'nexus' : null,
                o?.has_system ? 'system' : null,
                o?.has_social ? 'social' : null,
                o?.has_finance ? 'finance' : null,
                o?.has_client ? 'client' : null,
                o?.has_operations ? 'operations' : null,
              ].filter((x): x is string => Boolean(x));
              const ownerName = o?.owner?.full_name || o?.owner?.email || o?.owner_id || '';
              return (
                <div key={String(o.id)} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-sm font-black text-slate-900 truncate">{String(o.name || '')}</div>
                  <div className="text-xs font-bold text-slate-600 truncate">כתובת: {o.slug || '-'}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">בעלים: {ownerName || '-'}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">חברים: {Number(o.membersCount ?? 0)}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">
                    מודולים: {mods.length ? mods.map((m) => MODULE_LABELS[m] || m).join(', ') : '-'}
                  </div>
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
                <th className="px-4 py-3 text-xs font-black text-slate-600">כתובת</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">בעלים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">חברים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">מודולים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.map((o) => {
                const mods = [
                  o?.has_nexus ? 'nexus' : null,
                  o?.has_system ? 'system' : null,
                  o?.has_social ? 'social' : null,
                  o?.has_finance ? 'finance' : null,
                  o?.has_client ? 'client' : null,
                  o?.has_operations ? 'operations' : null,
                ].filter((x): x is string => Boolean(x));

                const ownerName = o?.owner?.full_name || o?.owner?.email || o?.owner_id || '';

                return (
                  <tr key={String(o.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{o.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{o.slug || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{ownerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{Number(o.membersCount ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {mods.length ? mods.map((m) => MODULE_LABELS[m] || m).join(', ') : '-'}
                    </td>
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
                <div className="text-lg font-black text-slate-900">הוספת לקוח חדש</div>
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
                <label className="block text-xs font-black text-slate-600 mb-2">שם הלקוח/ארגון <span className="text-red-500">*</span></label>
                <Input
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="לדוגמה: סטודיו יוגה שלומית"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">כתובת (מזהה) <span className="text-red-500">*</span></label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="studio-yoga-shlomit"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">אימייל בעלים <span className="text-red-500">*</span></label>
                <Input
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  type="email"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">חובה! ישמש ליצירת חשבון הלקוח</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">חבילה</label>
                <div className="flex flex-wrap gap-1.5">
                  {PACKAGE_OPTIONS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setSelectedPackage(selectedPackage === p.key ? '' : p.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all ${
                        selectedPackage === p.key
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
                {selectedPackage && selectedModules.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedModules.map((m) => (
                      <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-700">
                        <Check size={10} strokeWidth={3} />
                        {MODULE_LABELS[m] || m}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-5 border-t border-slate-200">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                <p className="text-xs text-blue-900 font-bold">
                  💡 פעולה זו תיצור: <strong>לקוח חדש</strong> (client_clients) + <strong>ארגון</strong> (organization) + קישור ביניהם
                </p>
              </div>
              <div className="pt-2 flex gap-2">
                <Button disabled={!canSubmit || isPending} onClick={onSubmit} className="flex-1">
                  <Plus size={18} />
                  {isPending ? 'יוצר...' : 'צור לקוח + ארגון'}
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
