'use client';

import React, { useMemo } from 'react';
import { UserCheck } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { UserApprovalsPanel } from '@/components/saas/UserApprovalsPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminGlobalApprovalsPageClient() {
  const {
    userApprovalRequests,
    tenants,
    approveUserRequest,
    rejectUserRequest,
    addAllowedEmail,
    removeAllowedEmail,
    currentUser,
  } = useData();

  const safeTenants = useMemo(() => (Array.isArray(tenants) ? tenants : []), [tenants]);
  const safeRequests = useMemo(
    () => (Array.isArray(userApprovalRequests) ? userApprovalRequests : []),
    [userApprovalRequests]
  );

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="אישורים" subtitle="ניהול אישורי משתמשים" icon={UserCheck} />
      <UserApprovalsPanel
        approvalRequests={safeRequests}
        tenants={safeTenants}
        onApprove={approveUserRequest}
        onReject={rejectUserRequest}
        onAddAllowedEmail={addAllowedEmail}
        onRemoveAllowedEmail={removeAllowedEmail}
        currentUserId={String(currentUser?.id || '')}
        hideHeader
      />
    </div>
  );
}
