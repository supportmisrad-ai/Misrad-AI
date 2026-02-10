'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { GlobalUsersPanel } from '@/components/saas/GlobalUsersPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { asObject } from '@/lib/shared/unknown';
import type { ModuleId, Tenant } from '@/types';

function isModuleId(value: unknown): value is ModuleId {
  switch (value) {
    case 'crm':
    case 'finance':
    case 'ai':
    case 'team':
    case 'content':
    case 'assets':
    case 'operations':
      return true;
    default:
      return false;
  }
}

function toTenant(value: unknown): Tenant | null {
  const obj = asObject(value);
  if (!obj) return null;

  const id = typeof obj.id === 'string' ? obj.id : null;
  const name = typeof obj.name === 'string' ? obj.name : null;
  if (!id || !name) return null;

  const ownerEmail = typeof obj.ownerEmail === 'string' ? obj.ownerEmail : '';
  const subdomain = typeof obj.subdomain === 'string' ? obj.subdomain : '';
  const plan = typeof obj.plan === 'string' ? obj.plan : '';

  const statusRaw = typeof obj.status === 'string' ? obj.status : 'Trial';
  const status: Tenant['status'] =
    statusRaw === 'Active' || statusRaw === 'Trial' || statusRaw === 'Churned' || statusRaw === 'Provisioning'
      ? statusRaw
      : 'Trial';

  const joinedAt = typeof obj.joinedAt === 'string' ? obj.joinedAt : '';

  const mrrRaw = obj.mrr;
  const mrr = typeof mrrRaw === 'number' ? mrrRaw : Number(mrrRaw ?? 0) || 0;

  const usersCountRaw = obj.usersCount;
  const usersCount = typeof usersCountRaw === 'number' ? usersCountRaw : Number(usersCountRaw ?? 0) || 0;

  const logo = typeof obj.logo === 'string' ? obj.logo : undefined;
  const modulesRaw = obj.modules;
  const modules = Array.isArray(modulesRaw) ? modulesRaw.filter(isModuleId) : [];

  return {
    id,
    name,
    ownerEmail,
    subdomain,
    plan,
    status,
    joinedAt,
    mrr,
    usersCount,
    logo,
    modules,
  };
}

export default function AdminGlobalUsersPageClient() {
  const { tenants, addToast } = useData();

  const safeTenants = React.useMemo(() => {
    if (!Array.isArray(tenants)) return [];
    const mapped = tenants.map(toTenant).filter((t): t is Tenant => Boolean(t));
    const seen = new Set<string>();
    return mapped.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tenants]);

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="משתמשי מערכת" subtitle="ניהול משתמשים גלובלי" icon={Users} />
      <GlobalUsersPanel tenants={safeTenants} addToast={addToast} hideHeader />
    </div>
  );
}
