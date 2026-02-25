'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Copy, Plus, X, Check, Settings, Trash2, RotateCcw, Archive } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { createOrganizationOrInviteOwner } from '@/app/actions/admin-organizations';
import { softDeleteOrganization, restoreOrganization, getDeletedOrganizations } from '@/app/actions/manage-organization';
import type { OrganizationWithOwner } from '@/app/actions/admin-organizations';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminBreadcrumbs from '@/components/admin/AdminBreadcrumbs';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import { AdminFadeIn } from '@/components/admin/AdminMotion';
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
  { key: 'the_mentor', label: 'מנטור', emoji: '🧠' },
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
  const [businessClientId, setBusinessClientId] = useState<string>('');
  const [businessClients, setBusinessClients] = useState<{ id: string; company_name: string }[]>([]);

  // Recycle bin
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedOrgs, setDeletedOrgs] = useState<Array<{ id: string; name: string; slug: string | null; deleted_at: Date; subscription_status: string | null; owner_name: string | null; owner_email: string | null }>>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');

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
    setBusinessClientId('');
  };

  const openModal = async () => {
    setIsOpen(true);
    setSlugTouched(false);
    if (!slugTouched && name.trim()) setSlug(generateOrgSlug(name));
    if (businessClients.length === 0) {
      try {
        const { getBusinessClients } = await import('@/app/actions/business-clients');
        const res = await getBusinessClients({});
        if (res.ok && res.clients) {
          setBusinessClients(res.clients.map((c: { id: string; company_name: string }) => ({ id: c.id, company_name: c.company_name })));
        }
      } catch {
        // ignore
      }
    }
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
          businessClientId: businessClientId || null,
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

  const handleDelete = async (orgId: string) => {
    startTransition(async () => {
      try {
        const res = await softDeleteOrganization(orgId);
        if (!res.ok) {
          addToast(('error' in res ? res.error : null) || 'שגיאה במחיקה', 'error');
          return;
        }
        addToast('הארגון הועבר לסל המיחזור', 'success');
        setConfirmDeleteId(null);
        router.refresh();
      } catch {
        addToast('שגיאה במחיקה', 'error');
      }
    });
  };

  const handleRestore = async (orgId: string) => {
    startTransition(async () => {
      try {
        const res = await restoreOrganization(orgId);
        if (!res.ok) {
          addToast(('error' in res ? res.error : null) || 'שגיאה בשחזור', 'error');
          return;
        }
        addToast('הארגון שוחזר בהצלחה', 'success');
        await loadDeletedOrgs();
        router.refresh();
      } catch {
        addToast('שגיאה בשחזור', 'error');
      }
    });
  };

  const loadDeletedOrgs = async () => {
    setLoadingDeleted(true);
    try {
      const res = await getDeletedOrganizations();
      if (res.ok && res.organizations) {
        setDeletedOrgs(res.organizations);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDeleted(false);
    }
  };

  const toggleRecycleBin = async () => {
    const next = !showRecycleBin;
    setShowRecycleBin(next);
    if (next) {
      await loadDeletedOrgs();
    }
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
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminBreadcrumbs items={[
        { label: 'אדמין', href: '/app/admin' },
        { label: 'לקוחות', href: '/app/admin/dashboard/customers' },
        { label: 'ניהול ארגונים' },
      ]} />

      <AdminFadeIn>
        <AdminPageHeader title="ארגונים" subtitle="ניהול ארגונים ולקוחות" icon={Building2} />
      </AdminFadeIn>

      <AdminToolbar
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={toggleRecycleBin}>
              <Archive size={16} />
              {showRecycleBin ? 'חזור לרשימה' : 'סל מיחזור'}
              {deletedOrgs.length > 0 && !showRecycleBin ? (
                <span className="mr-1 px-1.5 py-0.5 text-[10px] font-black bg-red-100 text-red-700 rounded-full">{deletedOrgs.length}</span>
              ) : null}
            </Button>
            <Button onClick={openModal}>
              <Plus size={18} />
              הקמת ארגון חדש
            </Button>
          </div>
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
          <AdminEmptyState
            icon={Building2}
            title="אין ארגונים במערכת"
            description="צור ארגון חדש כדי להתחיל לנהל לקוחות, משתמשים ומנויים."
            actionLabel="הקמת ארגון חדש"
            onAction={openModal}
          />
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
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-sm font-black text-slate-900 truncate">{String(o.name || '')}</div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/app/admin/organizations/${o.id}`}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-600" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setConfirmDeleteId(o.id); setConfirmDeleteName(o.name); }}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      o.subscription_status === 'active' ? 'bg-green-100 text-green-800'
                      : o.subscription_status === 'trial' ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-600'
                    }`}>
                      {o.subscription_status === 'active' ? 'פעיל' : o.subscription_status === 'trial' ? 'ניסיון' : 'מבוטל'}
                    </span>
                    {o.subscription_plan && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                        {String(o.subscription_plan).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-600 truncate mt-1">כתובת: {o.slug || '-'}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">בעלים: {ownerName || '-'}</div>
                  <div className="mt-1 text-xs font-bold text-slate-600 truncate">חברים: {Number(o.membersCount ?? 0)}</div>
                  {o.businessClientName ? (
                    <div className="mt-1 text-xs font-bold text-slate-700 truncate">לקוח עסקי: {o.businessClientName}</div>
                  ) : null}
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
                <th className="px-4 py-3 text-xs font-black text-slate-600">סטטוס</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">חבילה</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">בעלים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">חברים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">לקוח עסקי</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">מודולים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600 text-center">פעולות</th>
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
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        o.subscription_status === 'active' ? 'bg-green-100 text-green-800'
                        : o.subscription_status === 'trial' ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                      }`}>
                        {o.subscription_status === 'active' ? 'פעיל' : o.subscription_status === 'trial' ? 'ניסיון' : 'מבוטל'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{o.subscription_plan ? String(o.subscription_plan).toUpperCase() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{ownerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{Number(o.membersCount ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-bold">{o.businessClientName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {mods.length ? mods.map((m) => MODULE_LABELS[m] || m).join(', ') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/app/admin/organizations/${o.id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          נהל
                        </Link>
                        <button
                          type="button"
                          onClick={() => { setConfirmDeleteId(o.id); setConfirmDeleteName(o.name); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 text-xs font-bold transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recycle Bin */}
      {showRecycleBin ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-amber-50 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Archive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm font-black text-amber-900">סל מיחזור</div>
              <div className="text-xs font-bold text-amber-700">ארגונים שנמחקו — ניתן לשחזר בכל עת</div>
            </div>
          </div>

          {loadingDeleted ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">טוען...</div>
          ) : deletedOrgs.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">סל המיחזור ריק</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {deletedOrgs.map((o) => (
                <div key={o.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 truncate">{o.name}</div>
                    <div className="text-xs font-bold text-slate-500 mt-0.5">
                      {o.owner_name || o.owner_email || '—'}
                      {o.deleted_at ? (
                        <span className="mr-2 text-red-500">
                          נמחק {new Date(o.deleted_at).toLocaleDateString('he-IL')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(o.id)}
                    disabled={isPending}
                    className="shrink-0 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <RotateCcw size={14} />
                    שחזר
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Confirm Delete Dialog */}
      {confirmDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setConfirmDeleteId(null)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-white border border-slate-200 shadow-xl p-6 text-center" dir="rtl">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">מחיקת ארגון</h3>
            <p className="text-sm text-slate-600 mb-1">
              האם למחוק את <strong>{confirmDeleteName}</strong>?
            </p>
            <p className="text-xs text-slate-500 mb-5">
              הארגון יועבר לסל המיחזור. הנתונים יישמרו וניתן לשחזר בכל עת.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isPending}
              >
                {isPending ? 'מוחק...' : 'מחק ארגון'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDeleteId(null)}
                disabled={isPending}
              >
                ביטול
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Building2 size={18} className="text-slate-700" />
                </div>
                <div className="text-lg font-black text-slate-900">הקמת ארגון חדש</div>
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
                <label className="block text-xs font-black text-slate-600 mb-2">שם הארגון <span className="text-red-500">*</span></label>
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
                <label className="block text-xs font-black text-slate-600 mb-2">קישור ללקוח עסקי (אופציונלי)</label>
                <CustomSelect
                  value={businessClientId}
                  onChange={(val) => setBusinessClientId(val)}
                  disabled={isPending}
                  placeholder="— ללא קישור ללקוח עסקי —"
                  options={businessClients.map((bc) => ({ value: bc.id, label: bc.company_name }))}
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
                          ? 'bg-slate-900 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
                {selectedPackage && selectedModules.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedModules.map((m) => (
                      <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
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
                  💡 פעולה זו תיצור <strong>ארגון חדש</strong> במערכת + לקוח מקושר אוטומטית
                </p>
              </div>
              <div className="pt-2 flex gap-2">
                <Button disabled={!canSubmit || isPending} onClick={onSubmit} className="flex-1">
                  <Plus size={18} />
                  {isPending ? 'יוצר...' : 'צור ארגון'}
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
