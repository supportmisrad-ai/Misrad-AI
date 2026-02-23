'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CreditCard,
  Moon,
  RefreshCw,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateOrganization } from '@/app/actions/admin-organizations';
import OrgImpersonateButton from '@/app/app/admin/OrgImpersonateButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminBreadcrumbs from '@/components/admin/AdminBreadcrumbs';
import { AdminFadeIn } from '@/components/admin/AdminMotion';
import type {
  OrgDetailResult,
  OrgDetailRecord,
  OrgMemberRecord,
  OrgOwnerRecord,
  OrgSettingsRecord,
} from '@/app/actions/admin-org-details';

type Tab = 'members' | 'settings' | 'billing';

const MODULE_LABELS: Record<string, string> = {
  nexus: 'נקסוס',
  system: 'מערכת',
  social: 'סושיאל',
  finance: 'פיננסים',
  client: 'לקוחות',
  operations: 'תפעול',
};

function getActiveModules(org: OrgDetailRecord): string[] {
  const mods: string[] = [];
  if (org.has_nexus) mods.push('nexus');
  if (org.has_system) mods.push('system');
  if (org.has_social) mods.push('social');
  if (org.has_finance) mods.push('finance');
  if (org.has_client) mods.push('client');
  if (org.has_operations) mods.push('operations');
  return mods;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = String(status || '').toLowerCase();
  let color = 'bg-slate-100 text-slate-700';
  if (s === 'active' || s === 'paid') color = 'bg-emerald-100 text-emerald-700';
  if (s === 'trial') color = 'bg-amber-100 text-amber-700';
  if (s === 'churned' || s === 'cancelled') color = 'bg-red-100 text-red-700';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${color}`}>
      {status || '—'}
    </span>
  );
}

function ShabbatBadge({ protected: isProtected, isMedicalExempt }: { protected: boolean | null; isMedicalExempt?: boolean }) {
  if (isProtected === true || isProtected === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-violet-100 text-violet-700">
        <Moon size={12} />
        סגור בשבת
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-700">
      <Shield size={12} />
      פטור רפואי — פעיל בשבת
    </span>
  );
}

export default function OrgDetailClient({ data }: { data: OrgDetailResult }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { organization: org, owner, members, membersCount, settings } = data;

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleShabbat = () => {
    if (!org.is_medical_exempt) {
      showToast('ניתן לבטל סגירת שבת רק עבור מוסדות רפואיים מאושרים', 'error');
      return;
    }
    startTransition(async () => {
      const newVal = !org.is_shabbat_protected;
      const res = await updateOrganization({
        organizationId: org.id,
        is_shabbat_protected: newVal,
      });
      if (res.success) {
        showToast(`מצב שבת: ${newVal ? 'סגור בשבת' : 'פטור רפואי — פעיל בשבת'}`, 'success');
        router.refresh();
      } else {
        showToast(res.error || 'שגיאה בעדכון', 'error');
      }
    });
  };

  const handleToggleMedicalExempt = () => {
    startTransition(async () => {
      const newVal = !org.is_medical_exempt;
      const res = await updateOrganization({
        organizationId: org.id,
        is_medical_exempt: newVal,
      });
      if (res.success) {
        showToast(`סיווג מוסד רפואי ${newVal ? 'הופעל' : 'בוטל'}`, 'success');
        router.refresh();
      } else {
        showToast(res.error || 'שגיאה בעדכון', 'error');
      }
    });
  };

  const handleToggleModule = (moduleKey: string, currentValue: boolean | null) => {
    startTransition(async () => {
      const fieldMap: Record<string, string> = {
        nexus: 'has_nexus',
        system: 'has_system',
        social: 'has_social',
        finance: 'has_finance',
        client: 'has_client',
        operations: 'has_operations',
      };
      const field = fieldMap[moduleKey];
      if (!field) return;

      const res = await updateOrganization({
        organizationId: org.id,
        [field]: !currentValue,
      });
      if (res.success) {
        showToast(`מודול ${MODULE_LABELS[moduleKey] || moduleKey} ${!currentValue ? 'הופעל' : 'בוטל'}`, 'success');
        router.refresh();
      } else {
        showToast(res.error || 'שגיאה בעדכון', 'error');
      }
    });
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'members', label: `משתמשים (${membersCount})`, icon: Users },
    { key: 'settings', label: 'הגדרות', icon: Settings },
    { key: 'billing', label: 'מנוי וחיוב', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      {toastMsg ? (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-sm font-black ${
            toastMsg.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toastMsg.text}
        </div>
      ) : null}

      <AdminBreadcrumbs items={[
        { label: 'אדמין', href: '/app/admin' },
        { label: 'ארגונים', href: '/app/admin/organizations' },
        { label: org.name },
      ]} />

      <AdminFadeIn>
        <AdminPageHeader
          title={org.name}
          subtitle={org.slug ? `/${org.slug}` : 'ללא כתובת'}
          icon={Building2}
        />
      </AdminFadeIn>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">סטטוס מנוי</div>
          <div className="mt-2">
            <StatusBadge status={org.subscription_status} />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">מצב שבת</div>
          <div className="mt-2">
            <ShabbatBadge protected={org.is_shabbat_protected} isMedicalExempt={org.is_medical_exempt} />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">משתמשים</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{membersCount}</div>
          {org.seats_allowed ? (
            <div className="text-xs font-bold text-slate-400">מתוך {org.seats_allowed} מותרים</div>
          ) : null}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500">קרדיטי AI</div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {Math.round(org.ai_credits_balance_cents / 100).toLocaleString('he-IL')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <OrgImpersonateButton
          orgSlug={org.slug}
          fallbackOrgId={org.id}
          clientId={null}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            startTransition(() => router.refresh());
          }}
          disabled={isPending}
        >
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
          רענון
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-black transition-colors border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-slate-900 text-slate-900 bg-slate-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} className="sm:w-4 sm:h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-3 sm:p-5">
          {activeTab === 'members' ? (
            <MembersTab members={members} owner={owner} orgId={org.id} />
          ) : null}
          {activeTab === 'settings' ? (
            <SettingsTab
              org={org}
              settings={settings}
              isPending={isPending}
              onToggleShabbat={handleToggleShabbat}
              onToggleMedicalExempt={handleToggleMedicalExempt}
              onToggleModule={handleToggleModule}
            />
          ) : null}
          {activeTab === 'billing' ? (
            <BillingTab org={org} />
          ) : null}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="text-sm font-black text-slate-800 mb-3">פרטי בעלים</div>
        {owner ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="שם" value={owner.full_name} />
            <InfoRow label="אימייל" value={owner.email} />
            <InfoRow label="תפקיד" value={owner.role} />
            <InfoRow label="מזהה" value={owner.id} />
          </div>
        ) : (
          <div className="text-sm text-slate-500">לא נמצא בעלים</div>
        )}
      </div>
    </div>
  );
}

function MembersTab({
  members,
  owner,
  orgId,
}: {
  members: OrgMemberRecord[];
  owner: OrgOwnerRecord | null;
  orgId: string;
}) {
  const [query, setQuery] = useState('');

  const filtered = members.filter((m) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש משתמש לפי שם או אימייל..."
        className="w-full max-w-md px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      {filtered.length === 0 ? (
        <div className="text-sm text-slate-500 py-4">
          {query ? 'לא נמצאו תוצאות' : 'אין משתמשים בארגון זה'}
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {filtered.map((m) => (
              <div key={m.id} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-black text-slate-900 truncate">{m.full_name || '—'}</div>
                  {owner && m.id === owner.id ? <Shield size={14} className="text-slate-700 shrink-0" /> : null}
                </div>
                <div className="text-xs font-bold text-slate-600 truncate mt-1">{m.email || '—'}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{m.role || '—'}</span>
                  <span>{formatDate(m.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-black text-slate-600">שם</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-600">אימייל</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-600">תפקיד</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-600">הצטרף</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-600">בעלים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">
                      {m.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{m.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{m.role || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(m.created_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      {owner && m.id === owner.id ? (
                        <Shield size={14} className="text-slate-700" />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsTab({
  org,
  settings,
  isPending,
  onToggleShabbat,
  onToggleMedicalExempt,
  onToggleModule,
}: {
  org: OrgDetailRecord;
  settings: OrgSettingsRecord | null;
  isPending: boolean;
  onToggleShabbat: () => void;
  onToggleMedicalExempt: () => void;
  onToggleModule: (moduleKey: string, currentValue: boolean | null) => void;
}) {
  const allModules = [
    { key: 'nexus', label: 'נקסוס', value: org.has_nexus },
    { key: 'system', label: 'מערכת', value: org.has_system },
    { key: 'social', label: 'סושיאל', value: org.has_social },
    { key: 'finance', label: 'פיננסים', value: org.has_finance },
    { key: 'client', label: 'לקוחות', value: org.has_client },
    { key: 'operations', label: 'תפעול', value: org.has_operations },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-black text-slate-800 mb-3">מצב שבת</div>
        <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 space-y-3">
          <div className="flex items-center gap-4">
            <ShabbatBadge protected={org.is_shabbat_protected} isMedicalExempt={org.is_medical_exempt} />
          </div>
          <p className="text-xs text-slate-600">
            ברירת מחדל: המערכת סגורה בשבת לכל הארגונים. רק מוסדות רפואיים מאושרים יכולים לפעול בשבת.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant={org.is_medical_exempt ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleMedicalExempt}
              disabled={isPending}
            >
              {org.is_medical_exempt ? '✅ מוסד רפואי מאושר' : 'סמן כמוסד רפואי'}
            </Button>
            {org.is_medical_exempt ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleShabbat}
                disabled={isPending}
              >
                {org.is_shabbat_protected ? 'אפשר פעילות בשבת' : 'החזר סגירת שבת'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-black text-slate-800 mb-3">מודולים פעילים</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allModules.map((mod) => (
            <button
              key={mod.key}
              type="button"
              onClick={() => onToggleModule(mod.key, mod.value)}
              disabled={isPending}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-colors ${
                mod.value
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {mod.value ? <Check size={14} /> : <X size={14} />}
              {mod.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-black text-slate-800 mb-3">פרטי ארגון</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="מזהה" value={org.id} />
          <InfoRow label="כתובת (slug)" value={org.slug} />
          <InfoRow label="נוצר" value={formatDate(org.created_at)} />
          <InfoRow label="עודכן" value={formatDate(org.updated_at)} />
          <InfoRow label="מושבים מותרים" value={org.seats_allowed != null ? String(org.seats_allowed) : null} />
        </div>
      </div>

      {settings ? (
        <div>
          <div className="text-sm font-black text-slate-800 mb-3">הגדרות AI</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow
              label="מכסת AI (סנטים)"
              value={settings.ai_quota_cents != null ? String(settings.ai_quota_cents) : null}
            />
            <InfoRow
              label="DNA מותאם"
              value={settings.ai_dna && typeof settings.ai_dna === 'object' && Object.keys(settings.ai_dna).length > 0 ? 'כן' : 'לא'}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BillingTab({ org }: { org: OrgDetailRecord }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoRow label="סטטוס מנוי" value={org.subscription_status} />
        <InfoRow label="תוכנית" value={org.subscription_plan} />
        <InfoRow label="תחילת ניסיון" value={formatDate(org.trial_start_date)} />
        <InfoRow label="ימי ניסיון" value={org.trial_days != null ? String(org.trial_days) : null} />
        <InfoRow label="תחילת מנוי" value={formatDate(org.subscription_start_date)} />
        <InfoRow
          label="קרדיטי AI"
          value={`${Math.round(org.ai_credits_balance_cents / 100).toLocaleString('he-IL')} קרדיטים`}
        />
      </div>

      <div>
        <div className="text-sm font-black text-slate-800 mb-3">מודולים פעילים</div>
        <div className="flex flex-wrap gap-2">
          {getActiveModules(org).map((mod) => (
            <span
              key={mod}
              className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black"
            >
              {MODULE_LABELS[mod] || mod}
            </span>
          ))}
          {getActiveModules(org).length === 0 ? (
            <span className="text-sm text-slate-500">אין מודולים פעילים</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="bg-slate-50 rounded-xl px-4 py-3">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="text-sm font-black text-slate-900 mt-1 break-all">{value || '—'}</div>
    </div>
  );
}
