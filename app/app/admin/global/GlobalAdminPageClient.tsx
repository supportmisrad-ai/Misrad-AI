'use client';

import React, { useMemo, useState } from 'react';
import { Globe, Users, Megaphone, ShieldCheck } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { VersionManagementPanel } from '@/components/saas/VersionManagementPanel';
import { UserApprovalsPanel } from '@/components/saas/UserApprovalsPanel';
import { AnnouncementsPanel } from '@/components/saas/AnnouncementsPanel';
import { GlobalUsersPanel } from '@/components/saas/GlobalUsersPanel';

type GlobalAdminTab = 'versions' | 'approvals' | 'announcements' | 'users';

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ElementType;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-colors border ${
        props.active
          ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon size={16} />
      {props.label}
    </button>
  );
}

export default function GlobalAdminPageClient() {
  const {
    tenants,
    availableVersions,
    updateTenantVersion,
    userApprovalRequests,
    approveUserRequest,
    rejectUserRequest,
    addAllowedEmail,
    removeAllowedEmail,
    currentUser,
    addToast,
  } = useData();

  const [tab, setTab] = useState<GlobalAdminTab>('versions');

  const safeTenants = useMemo(() => (Array.isArray(tenants) ? tenants : []), [tenants]);
  const safeVersions = useMemo(
    () => (Array.isArray(availableVersions) && availableVersions.length ? availableVersions : ['2.5.0', '2.6.0', '2.6.0-beta', '2.7.0-alpha']),
    [availableVersions]
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <Globe className="text-slate-700" size={22} />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-900">גלובלי</div>
          <div className="text-sm font-bold text-slate-500 mt-1">ניהול מרכזי: גרסאות, אישורים, הודעות, משתמשים</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'versions'} onClick={() => setTab('versions')} label="Versions" icon={Globe} />
        <TabButton active={tab === 'approvals'} onClick={() => setTab('approvals')} label="Approvals" icon={ShieldCheck} />
        <TabButton active={tab === 'announcements'} onClick={() => setTab('announcements')} label="Announcements" icon={Megaphone} />
        <TabButton active={tab === 'users'} onClick={() => setTab('users')} label="Global Users" icon={Users} />
      </div>

      <div>
        {tab === 'versions' ? (
          <VersionManagementPanel
            tenants={safeTenants as any}
            availableVersions={safeVersions}
            onUpdateVersion={updateTenantVersion}
            onRollback={(tenantId, version) => updateTenantVersion(tenantId, version)}
          />
        ) : null}

        {tab === 'approvals' ? (
          <UserApprovalsPanel
            approvalRequests={(userApprovalRequests || []) as any}
            tenants={safeTenants as any}
            onApprove={approveUserRequest}
            onReject={rejectUserRequest}
            onAddAllowedEmail={addAllowedEmail}
            onRemoveAllowedEmail={removeAllowedEmail}
            currentUserId={String(currentUser?.id || '')}
          />
        ) : null}

        {tab === 'announcements' ? (
          <AnnouncementsPanel currentUser={currentUser} addToast={addToast} />
        ) : null}

        {tab === 'users' ? (
          <GlobalUsersPanel tenants={safeTenants as any} addToast={addToast} />
        ) : null}
      </div>
    </div>
  );
}
