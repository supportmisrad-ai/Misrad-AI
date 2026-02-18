'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, ChevronLeft, ExternalLink, RefreshCw, Users } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { Button } from '@/components/ui/button';
import { getOrganizationMembersLite } from '@/app/actions/admin-organizations';
import type { OrganizationWithOwner, UserLite } from '@/app/actions/admin-organizations';
import OrgImpersonateButton from '@/app/app/admin/OrgImpersonateButton';

export type CustomerOwnerGroup = {
  ownerId: string;
  owner: OrganizationWithOwner['owner'] | null | undefined;
  organizations: OrganizationWithOwner[];
};

type MembersState = {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  users: UserLite[];
  error: string | null;
};

type LoadMembersOptions = {
  force?: boolean;
};

const MODULE_LABELS: Record<string, string> = {
  nexus: 'נקסוס',
  system: 'מערכת',
  social: 'סושיאל',
  finance: 'פיננסים',
  client: 'לקוחות',
  operations: 'תפעול',
};

function getOwnerTitle(group: CustomerOwnerGroup): string {
  const owner = group.owner;
  const fullName = owner?.full_name ? String(owner.full_name).trim() : '';
  if (fullName) return fullName;

  const email = owner?.email ? String(owner.email).trim() : '';
  if (email) return email;

  return group.ownerId;
}

function getOwnerSubtitle(group: CustomerOwnerGroup): string {
  const owner = group.owner;
  const email = owner?.email ? String(owner.email).trim() : '';
  if (email && email !== getOwnerTitle(group)) return email;
  return '';
}

function getOrgModules(org: OrganizationWithOwner): string[] {
  const mods = [
    org.has_nexus ? 'nexus' : null,
    org.has_system ? 'system' : null,
    org.has_social ? 'social' : null,
    org.has_finance ? 'finance' : null,
    org.has_client ? 'client' : null,
    org.has_operations ? 'operations' : null,
  ].filter((x): x is string => Boolean(x));

  return mods.map((mod) => MODULE_LABELS[mod] || mod);
}

function getOwnerUsersCount(group: CustomerOwnerGroup): number {
  const list = Array.isArray(group.organizations) ? group.organizations : [];
  return list.reduce((acc, o) => acc + Number(o.membersCount ?? 0), 0);
}

export default function AdminCustomersClient(props: { groups: CustomerOwnerGroup[] }) {
  const router = useRouter();
  const groups = Array.isArray(props.groups) ? props.groups : [];

  const [query, setQuery] = useState('');
  const [expandedOwners, setExpandedOwners] = useState<Record<string, boolean>>({});
  const [expandedOrganizations, setExpandedOrganizations] = useState<Record<string, boolean>>({});
  const [membersByOrg, setMembersByOrg] = useState<Record<string, MembersState>>({});
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;

    return groups.filter((g) => {
      const ownerTitle = getOwnerTitle(g).toLowerCase();
      const ownerSubtitle = getOwnerSubtitle(g).toLowerCase();
      if (ownerTitle.includes(q) || ownerSubtitle.includes(q)) return true;

      return g.organizations.some((o) => {
        const name = String(o.name || '').toLowerCase();
        const slug = String(o.slug || '').toLowerCase();
        return name.includes(q) || slug.includes(q);
      });
    });
  }, [groups, query]);

  const filteredStats = useMemo(() => {
    const ownersCount = filtered.length;
    const orgsCount = filtered.reduce((acc, g) => acc + (Array.isArray(g.organizations) ? g.organizations.length : 0), 0);
    const usersCount = filtered.reduce(
      (acc, g) =>
        acc +
        (Array.isArray(g.organizations)
          ? g.organizations.reduce((a, o) => a + Number(o.membersCount ?? 0), 0)
          : 0),
      0
    );
    return { ownersCount, orgsCount, usersCount };
  }, [filtered]);

  const filteredOrgIds = useMemo(() => {
    const ids: string[] = [];
    for (const g of filtered) {
      for (const o of Array.isArray(g.organizations) ? g.organizations : []) {
        ids.push(String(o.id));
      }
    }
    return Array.from(new Set(ids.filter(Boolean)));
  }, [filtered]);

  const toggleOwner = (ownerId: string) => {
    setExpandedOwners((prev) => ({ ...prev, [ownerId]: !prev[ownerId] }));
  };

  const toggleOrganization = (orgId: string) => {
    setExpandedOrganizations((prev) => ({ ...prev, [orgId]: !prev[orgId] }));
  };

  const loadMembers = (orgId: string, options?: LoadMembersOptions) => {
    const current = membersByOrg[orgId];
    const force = Boolean(options?.force);
    if (!force && (current?.status === 'loading' || current?.status === 'loaded')) return;

    startTransition(async () => {
      setMembersByOrg((prev) => ({
        ...prev,
        [orgId]: { status: 'loading', users: prev[orgId]?.users || [], error: null },
      }));

      const res = await getOrganizationMembersLite({ organizationId: orgId, limit: 200 });
      if (!res.success) {
        setMembersByOrg((prev) => ({
          ...prev,
          [orgId]: {
            status: 'error',
            users: prev[orgId]?.users || [],
            error: res.error || 'שגיאה בטעינת משתמשי ארגון',
          },
        }));
        return;
      }

      setMembersByOrg((prev) => ({
        ...prev,
        [orgId]: { status: 'loaded', users: res.data || [], error: null },
      }));
    });
  };

  const onOrgRowClick = (orgId: string) => {
    const next = !expandedOrganizations[orgId];
    toggleOrganization(orgId);
    if (next) loadMembers(orgId);
  };

  const expandAllOwners = () => {
    setExpandedOwners(() => Object.fromEntries(filtered.map((g) => [g.ownerId, true])));
  };

  const collapseAllOwners = () => {
    setExpandedOwners({});
    setExpandedOrganizations({});
  };

  const expandAllWorkspaces = () => {
    setExpandedOrganizations(() => Object.fromEntries(filteredOrgIds.map((id) => [id, true])));
  };

  const collapseAllWorkspaces = () => {
    setExpandedOrganizations({});
  };

  const openWorkspace = (orgSlug: string | null, fallbackOrgId: string) => {
    const target = orgSlug || fallbackOrgId;
    router.push(`/w/${encodeURIComponent(String(target))}`);
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader
        title="לקוחות"
        subtitle="לקוח → ארגונים → משתמשים"
        icon={Users}
      />

      <AdminToolbar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="חפש לפי שם/מייל לקוח או שם ארגון..."
        actions={
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => router.push('/app/admin/organizations?new=1')}>
                הוסף לקוח חדש
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.refresh()}>
                <RefreshCw size={16} />
                רענון
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={expandAllOwners} disabled={filtered.length === 0}>
                הרחב לקוחות
              </Button>
              <Button variant="outline" size="sm" onClick={expandAllWorkspaces} disabled={filteredOrgIds.length === 0}>
                הרחב ארגונים
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAllWorkspaces} disabled={filteredOrgIds.length === 0}>
                קפל ארגונים
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAllOwners} disabled={filtered.length === 0}>
                קפל הכל
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500">לקוחות</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{filteredStats.ownersCount.toLocaleString('he-IL')}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500">ארגונים</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{filteredStats.orgsCount.toLocaleString('he-IL')}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500">משתמשים (סה"כ)</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{filteredStats.usersCount.toLocaleString('he-IL')}</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-slate-900 font-black">לא נמצאו לקוחות</div>
          <div className="text-sm text-slate-600 mt-2">נסה לשנות את החיפוש.</div>
        </div>
      ) : null}

      <div className="space-y-3">
        {filtered.map((g) => {
          const ownerTitle = getOwnerTitle(g);
          const ownerSubtitle = getOwnerSubtitle(g);
          const isOpen = Boolean(expandedOwners[g.ownerId]);
          const orgCount = g.organizations.length;
          const ownerUsersCount = getOwnerUsersCount(g);

          return (
            <div key={g.ownerId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                className="w-full px-4 py-4 flex items-center justify-between gap-3 hover:bg-slate-50"
                onClick={() => toggleOwner(g.ownerId)}
              >
                <div className="min-w-0 text-right">
                  <div className="text-sm font-black text-slate-900 truncate">{ownerTitle}</div>
                  {ownerSubtitle ? <div className="text-xs font-bold text-slate-600 truncate">{ownerSubtitle}</div> : null}
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    ארגונים: {orgCount} · משתמשים: {ownerUsersCount}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Users size={18} className="text-indigo-700" />
                  </div>
                  <ChevronDown size={18} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </div>
              </button>

              {isOpen ? (
                <div className="border-t border-slate-100">
                  <div className="p-4 space-y-2">
                    {g.organizations
                      .slice()
                      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                      .map((org) => {
                        const orgId = String(org.id);
                        const orgOpen = Boolean(expandedOrganizations[orgId]);
                        const members = membersByOrg[orgId];
                        const membersCount = Number(org.membersCount ?? 0);
                        const mods = getOrgModules(org);
                        const orgSlug = org.slug ? String(org.slug) : null;
                        const fallbackOrgId = String(org.id);
                        const clientId = org.primaryClientId ? String(org.primaryClientId) : null;
                        const isMembersLoading = members?.status === 'loading';
                        const isLoadDisabled = isPending || isMembersLoading;
                        const loadLabel =
                          members?.status === 'loaded'
                            ? 'רענן משתמשים'
                            : members?.status === 'loading'
                              ? 'טוען...'
                              : 'טען משתמשים';

                        return (
                          <div key={orgId} className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="w-full px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50">
                              <button
                                type="button"
                                className="flex-1 min-w-0 text-right"
                                onClick={() => onOrgRowClick(orgId)}
                                aria-expanded={orgOpen}
                              >
                                <div className="text-sm font-black text-slate-900 truncate">{String(org.name || '')}</div>
                                <div className="text-xs font-bold text-slate-600 truncate">כתובת: {org.slug || '-'}</div>
                                <div className="text-xs font-bold text-slate-500 mt-1">משתמשים: {membersCount}</div>
                                <div className="text-xs font-bold text-slate-500 truncate">מודולים: {mods.length ? mods.join(', ') : '-'}</div>
                              </button>

                              <div className="shrink-0 flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                    <Building2 size={18} className="text-slate-700" />
                                  </div>
                                  {isMembersLoading ? <RefreshCw size={16} className="text-slate-400 animate-spin" /> : null}
                                  <ChevronLeft
                                    size={18}
                                    className={orgOpen ? '-rotate-90 transition-transform' : 'transition-transform'}
                                  />
                                </div>

                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isLoadDisabled}
                                    onClick={() => loadMembers(orgId, { force: members?.status === 'loaded' })}
                                    title={members?.status === 'loaded' ? 'רענון משתמשי ארגון' : 'טעינת משתמשי ארגון'}
                                  >
                                    <Users size={16} />
                                    {loadLabel}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/app/admin/org/${orgId}`)}
                                    title="פרטי ארגון"
                                  >
                                    <ExternalLink size={16} />
                                    פרטי ארגון
                                  </Button>
                                  <OrgImpersonateButton
                                    orgSlug={orgSlug}
                                    fallbackOrgId={fallbackOrgId}
                                    clientId={clientId}
                                  />
                                </div>
                              </div>
                            </div>

                            {orgOpen ? (
                              <div className="border-t border-slate-100 p-4">
                                {!members || members.status === 'idle' ? (
                                  <div className="space-y-3">
                                    <div className="text-sm font-black text-slate-900">משתמשים</div>
                                    <div className="text-xs font-bold text-slate-600">המשתמשים עדיין לא נטענו עבור ארגון זה.</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isLoadDisabled}
                                      onClick={() => loadMembers(orgId)}
                                    >
                                      <Users size={16} />
                                      טען משתמשים
                                    </Button>
                                  </div>
                                ) : members?.status === 'loading' ? (
                                  <div className="text-sm font-bold text-slate-600">טוען משתמשים...</div>
                                ) : members?.status === 'error' ? (
                                  <div className="space-y-3">
                                    <div className="text-sm font-black text-slate-900">שגיאה בטעינת משתמשים</div>
                                    <div className="text-xs font-bold text-slate-600">{members.error || 'שגיאה לא ידועה'}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isPending}
                                      onClick={() => loadMembers(orgId, { force: true })}
                                    >
                                      נסה שוב
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {(members?.users || []).length === 0 ? (
                                      <div className="text-sm font-bold text-slate-600">אין משתמשים בארגון</div>
                                    ) : (
                                      <div className="space-y-2">
                                        {(members?.users || []).map((u) => (
                                          <div
                                            key={String(u.id)}
                                            className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                                          >
                                            <div className="text-sm font-black text-slate-900 truncate">{u.full_name || u.email || u.clerk_user_id || u.id}</div>
                                            <div className="text-xs font-bold text-slate-600 truncate">{u.email || '-'}</div>
                                            <div className="text-xs font-bold text-slate-500 mt-1">תפקיד: {u.role || '-'}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

    </div>
  );
}
