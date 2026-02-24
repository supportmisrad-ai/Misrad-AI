'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  LayoutList,
  Network,
  Settings,
  ChevronDown,
  RefreshCw,
  Plus,
  ExternalLink,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import AdminBreadcrumbs from '@/components/admin/AdminBreadcrumbs';
import AdminEmptyState from '@/components/admin/AdminEmptyState';
import { AdminFadeIn } from '@/components/admin/AdminMotion';
import { Button } from '@/components/ui/button';
import type { OrganizationWithOwner } from '@/app/actions/admin-organizations';

type ViewMode = 'organizations' | 'owners';

const MODULE_LABELS: Record<string, string> = {
  nexus: 'נקסוס',
  system: 'מערכת',
  social: 'סושיאל',
  finance: 'פיננסים',
  client: 'לקוחות',
  operations: 'תפעול',
};

function getOrgModules(org: OrganizationWithOwner): string[] {
  return [
    org.has_nexus ? 'nexus' : null,
    org.has_system ? 'system' : null,
    org.has_social ? 'social' : null,
    org.has_finance ? 'finance' : null,
    org.has_client ? 'client' : null,
    org.has_operations ? 'operations' : null,
  ]
    .filter((x): x is string => Boolean(x))
    .map((m) => MODULE_LABELS[m] || m);
}

function StatusBadge({ status }: { status: string | null }) {
  const s = String(status || '').toLowerCase();
  let color = 'bg-slate-100 text-slate-700';
  if (s === 'active' || s === 'paid') color = 'bg-emerald-100 text-emerald-700';
  if (s === 'trial') color = 'bg-amber-100 text-amber-700';
  if (s === 'churned' || s === 'cancelled' || s === 'canceled') color = 'bg-red-100 text-red-700';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${color}`}>
      {status || '—'}
    </span>
  );
}

type OwnerGroup = {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  organizations: OrganizationWithOwner[];
  totalMembers: number;
};

export default function AdminCustomersUnifiedClient({
  orgs,
  error,
}: {
  orgs: OrganizationWithOwner[];
  error: string | null;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('organizations');
  const [query, setQuery] = useState('');
  const [expandedOwners, setExpandedOwners] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter((o) => {
      const name = String(o.name || '').toLowerCase();
      const slug = String(o.slug || '').toLowerCase();
      const ownerName = String(o.owner?.full_name || '').toLowerCase();
      const ownerEmail = String(o.owner?.email || '').toLowerCase();
      return name.includes(q) || slug.includes(q) || ownerName.includes(q) || ownerEmail.includes(q);
    });
  }, [orgs, query]);

  const ownerGroups = useMemo<OwnerGroup[]>(() => {
    const map = new Map<string, OwnerGroup>();
    for (const org of filtered) {
      const ownerId = org.owner_id || 'unknown';
      if (!map.has(ownerId)) {
        map.set(ownerId, {
          ownerId,
          ownerName: org.owner?.full_name || org.owner?.email || ownerId,
          ownerEmail: org.owner?.email || '',
          organizations: [],
          totalMembers: 0,
        });
      }
      const group = map.get(ownerId)!;
      group.organizations.push(org);
      group.totalMembers += Number(org.membersCount ?? 0);
    }
    return Array.from(map.values()).sort((a, b) => a.ownerName.localeCompare(b.ownerName));
  }, [filtered]);

  const stats = useMemo(() => {
    const active = filtered.filter((o) => o.subscription_status === 'active').length;
    const trial = filtered.filter((o) => o.subscription_status === 'trial').length;
    const totalMembers = filtered.reduce((sum, o) => sum + Number(o.membersCount ?? 0), 0);
    return { total: filtered.length, active, trial, owners: ownerGroups.length, totalMembers };
  }, [filtered, ownerGroups]);

  if (error) {
    return (
      <div className="space-y-6 pb-24" dir="rtl">
        <AdminBreadcrumbs items={[{ label: 'אדמין', href: '/app/admin' }, { label: 'לקוחות וארגונים' }]} />
        <AdminPageHeader title="לקוחות וארגונים" icon={Users} />
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm font-bold text-red-800">
          שגיאה בטעינת נתונים: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminBreadcrumbs items={[{ label: 'אדמין', href: '/app/admin' }, { label: 'לקוחות וארגונים' }]} />

      <AdminFadeIn>
        <AdminPageHeader
          title="לקוחות וארגונים"
          subtitle={`${stats.total} ארגונים · ${stats.owners} בעלים · ${stats.totalMembers} משתמשים`}
          icon={Users}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => router.push('/app/admin/organizations?new=1')}>
                <Plus size={16} />
                הקמת ארגון
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.refresh()}>
                <RefreshCw size={16} />
              </Button>
            </div>
          }
        />
      </AdminFadeIn>

      <AdminToolbar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="חפש לפי שם ארגון, בעלים או מייל..."
        actions={
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('organizations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'organizations'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList size={14} />
              ארגונים
            </button>
            <button
              type="button"
              onClick={() => setViewMode('owners')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                viewMode === 'owners'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network size={14} />
              לפי בעלים
            </button>
          </div>
        }
      />

      {/* Stats Row */}
      <AdminFadeIn delay={0.06}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-black text-slate-500">ארגונים</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-black text-emerald-600">פעילים</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-black text-amber-600">ניסיון</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.trial}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-black text-slate-500">בעלים</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.owners}</div>
          </div>
        </div>
      </AdminFadeIn>

      {/* Content */}
      <AdminFadeIn delay={0.12}>
        {filtered.length === 0 ? (
          <AdminEmptyState
            icon={Building2}
            title="לא נמצאו ארגונים"
            description={query ? 'נסה לשנות את מילות החיפוש' : 'עדיין אין ארגונים במערכת. צור ארגון חדש כדי להתחיל.'}
            actionLabel="הקמת ארגון חדש"
            actionHref="/app/admin/organizations?new=1"
          />
        ) : viewMode === 'organizations' ? (
          <OrganizationsTable orgs={filtered} />
        ) : (
          <OwnersView
            groups={ownerGroups}
            expandedOwners={expandedOwners}
            onToggleOwner={(id) =>
              setExpandedOwners((prev) => ({ ...prev, [id]: !prev[id] }))
            }
          />
        )}
      </AdminFadeIn>
    </div>
  );
}

function OrganizationsTable({ orgs }: { orgs: OrganizationWithOwner[] }) {
  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {orgs.map((o) => {
          const mods = getOrgModules(o);
          const ownerName = o.owner?.full_name || o.owner?.email || o.owner_id || '';
          return (
            <div key={String(o.id)} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900 truncate">{String(o.name || '')}</div>
                  <div className="text-xs font-bold text-slate-600 truncate">{o.slug || '-'}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={o.subscription_status} />
                  <Link href={`/app/admin/organizations/${o.id}`} className="p-1.5 rounded-lg hover:bg-slate-100">
                    <Settings className="w-4 h-4 text-slate-500" />
                  </Link>
                </div>
              </div>
              <div className="text-xs font-bold text-slate-500">בעלים: {ownerName}</div>
              <div className="text-xs font-bold text-slate-500">חברים: {Number(o.membersCount ?? 0)}</div>
              {mods.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {mods.map((m) => (
                    <span key={m} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{m}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-black text-slate-600">שם</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">כתובת</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">סטטוס</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">בעלים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">חברים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">מודולים</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600 text-center">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.map((o) => {
                const mods = getOrgModules(o);
                const ownerName = o.owner?.full_name || o.owner?.email || o.owner_id || '';
                return (
                  <tr key={String(o.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{o.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{o.slug || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.subscription_status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-700">{ownerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{Number(o.membersCount ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{mods.join(', ') || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/app/admin/organizations/${o.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        פרטים
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function OwnersView({
  groups,
  expandedOwners,
  onToggleOwner,
}: {
  groups: OwnerGroup[];
  expandedOwners: Record<string, boolean>;
  onToggleOwner: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const isOpen = Boolean(expandedOwners[g.ownerId]);
        return (
          <div key={g.ownerId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              className="w-full px-4 py-4 flex items-center justify-between gap-3 hover:bg-slate-50"
              onClick={() => onToggleOwner(g.ownerId)}
            >
              <div className="min-w-0 text-right">
                <div className="text-sm font-black text-slate-900 truncate">{g.ownerName}</div>
                {g.ownerEmail && g.ownerEmail !== g.ownerName && (
                  <div className="text-xs font-bold text-slate-600 truncate">{g.ownerEmail}</div>
                )}
                <div className="text-xs font-bold text-slate-500 mt-1">
                  ארגונים: {g.organizations.length} · משתמשים: {g.totalMembers}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Users size={18} className="text-slate-700" />
                </div>
                <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isOpen ? (
              <div className="border-t border-slate-100 p-4 space-y-2">
                {g.organizations
                  .slice()
                  .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                  .map((org) => {
                    const mods = getOrgModules(org);
                    return (
                      <div key={String(org.id)} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate">{org.name}</div>
                          <div className="text-xs font-bold text-slate-600">{org.slug || '-'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={org.subscription_status} />
                            <span className="text-xs font-bold text-slate-500">חברים: {Number(org.membersCount ?? 0)}</span>
                          </div>
                          {mods.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {mods.map((m) => (
                                <span key={m} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{m}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/app/admin/organizations/${org.id}`}
                          className="shrink-0 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <ExternalLink size={16} className="text-slate-500" />
                        </Link>
                      </div>
                    );
                  })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
