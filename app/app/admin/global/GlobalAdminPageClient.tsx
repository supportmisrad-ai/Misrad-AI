'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { VersionManagementPanel } from '@/components/saas/VersionManagementPanel';
import { UserApprovalsPanel } from '@/components/saas/UserApprovalsPanel';
import { AnnouncementsPanel } from '@/components/saas/AnnouncementsPanel';
import { GlobalUsersPanel } from '@/components/saas/GlobalUsersPanel';

type GlobalAdminTab = 'versions' | 'approvals' | 'announcements' | 'users';

export default function GlobalAdminPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    try {
      const raw = searchParams?.get('tab');
      if (!raw) return;
      const next = String(raw) as GlobalAdminTab;
      if (next === 'versions' || next === 'approvals' || next === 'announcements' || next === 'users') {
        setTab(next);
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  const setTabAndSyncUrl = (next: GlobalAdminTab) => {
    setTab(next);
    try {
      const qs = new URLSearchParams(searchParams?.toString() || '');
      qs.set('tab', next);
      router.replace(`/app/admin/global?${qs.toString()}`);
    } catch {
      // ignore
    }
  };

  const safeTenants = useMemo(() => (Array.isArray(tenants) ? tenants : []), [tenants]);
  const safeVersions = useMemo(
    () => (Array.isArray(availableVersions) && availableVersions.length ? availableVersions : ['2.5.0', '2.6.0', '2.6.0-beta', '2.7.0-alpha']),
    [availableVersions]
  );

  const content =
    tab === 'versions' ? (
      <VersionManagementPanel
        tenants={safeTenants as any}
        availableVersions={safeVersions}
        onUpdateVersion={updateTenantVersion}
        onRollback={(tenantId, version) => updateTenantVersion(tenantId, version)}
      />
    ) : tab === 'approvals' ? (
      <UserApprovalsPanel
        approvalRequests={(userApprovalRequests || []) as any}
        tenants={safeTenants as any}
        onApprove={approveUserRequest}
        onReject={rejectUserRequest}
        onAddAllowedEmail={addAllowedEmail}
        onRemoveAllowedEmail={removeAllowedEmail}
        currentUserId={String(currentUser?.id || '')}
      />
    ) : tab === 'announcements' ? (
      <AnnouncementsPanel currentUser={currentUser} addToast={addToast} />
    ) : (
      <GlobalUsersPanel tenants={safeTenants as any} addToast={addToast} />
    );

  return (
    <div dir="rtl">
      {content}
    </div>
  );
}
