'use client';

import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { VersionManagementPanel } from '@/components/saas/VersionManagementPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminGlobalVersionsPageClient() {
  const { tenants, availableVersions, updateTenantVersion } = useData();

  const safeTenants = useMemo(() => (Array.isArray(tenants) ? tenants : []), [tenants]);
  const safeVersions = useMemo(
    () =>
      Array.isArray(availableVersions) && availableVersions.length
        ? availableVersions
        : ['2.5.0', '2.6.0', '2.6.0-beta', '2.7.0-alpha'],
    [availableVersions]
  );

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="גרסאות" subtitle="ניהול גרסאות לקוחות" icon={Package} />
      <VersionManagementPanel
        tenants={safeTenants}
        availableVersions={safeVersions}
        onUpdateVersion={updateTenantVersion}
        onRollback={(tenantId, version) => updateTenantVersion(tenantId, version)}
        hideHeader
      />
    </div>
  );
}
