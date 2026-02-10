'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { RefreshCw, Server } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { TenantsPanel } from '@/components/saas/TenantsPanel';
import { AddTenantModal } from '@/components/saas/AddTenantModal';
import { ModuleManagementModal } from '@/components/saas/ModuleManagementModal';
import type { ModuleId, Tenant } from '@/types';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { Button } from '@/components/ui/button';


import { asObject } from '@/lib/shared/unknown';
function unwrapData(value: unknown): unknown {
  const obj = asObject(value);
  const data = obj?.data;
  if (data && typeof data === 'object') return data;
  return value;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === 'string' ? v : v == null ? null : String(v);
}

function getTenantArray(payload: unknown): Tenant[] {
  const obj = asObject(payload);
  const tenants = obj?.tenants;
  return Array.isArray(tenants) ? (tenants as Tenant[]) : [];
}

function getTenant(payload: unknown): Tenant | null {
  const obj = asObject(payload);
  const tenant = obj?.tenant;
  const tObj = asObject(tenant);
  const id = getStringProp(tObj, 'id');
  return id ? (tenant as Tenant) : null;
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const { tenants, addTenant, updateTenant, products, addToast, switchToTenantConfig, currentUser } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const loadTenants = async () => {
    if (!currentUser?.isSuperAdmin) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/tenants', { cache: 'no-store' });
      const raw: unknown = await res.json().catch(() => null);
      const data = unwrapData(raw);
      if (!res.ok) {
        throw new Error(getStringProp(asObject(data), 'error') || getStringProp(asObject(raw), 'error') || 'שגיאה בטעינת חשבונות SaaS');
      }

      const loaded = getTenantArray(data);
      const existingIds = new Set((Array.isArray(tenants) ? tenants : []).map((t: Tenant) => t.id));
      for (const t of loaded) {
        if (!existingIds.has(t.id)) addTenant(t);
      }
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בטעינת חשבונות SaaS', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.isSuperAdmin]);

  const totalMRR = useMemo(() => {
    const list = Array.isArray(tenants) ? (tenants as Tenant[]) : [];
    return list.filter((t) => t.status === 'Active').reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);
  }, [tenants]);

  const activeTenants = useMemo(() => {
    const list = Array.isArray(tenants) ? (tenants as Tenant[]) : [];
    return list.filter((t) => t.status === 'Active').length;
  }, [tenants]);

  const trialTenants = useMemo(() => {
    const list = Array.isArray(tenants) ? (tenants as Tenant[]) : [];
    return list.filter((t) => t.status === 'Trial').length;
  }, [tenants]);

  const totalUsers = useMemo(() => {
    const list = Array.isArray(tenants) ? (tenants as Tenant[]) : [];
    return list.reduce((acc, t) => acc + (Number(t.usersCount) || 0), 0);
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = Array.isArray(tenants) ? (tenants as Tenant[]) : [];
    if (!q) return list;
    return list.filter((t) => {
      const name = String(t.name || '').toLowerCase();
      const ownerEmail = String(t.ownerEmail || '').toLowerCase();
      return name.includes(q) || ownerEmail.includes(q);
    });
  }, [searchTerm, tenants]);

  const handleAddTenant = async (
    tenantData: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'status' | 'usersCount' | 'mrr'> & { modules?: ModuleId[] },
    mrr: number
  ) => {
    setIsAddTenantOpen(false);

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tenantData,
          mrr,
          status: 'Provisioning',
          modules: tenantData.modules || ['crm', 'team'],
          logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantData.name)}&background=6366f1&color=fff`,
        }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const data = unwrapData(raw);
      if (!res.ok) throw new Error(getStringProp(asObject(data), 'error') || getStringProp(asObject(raw), 'error') || 'שגיאה ביצירת חשבון SaaS');

      const newTenant = getTenant(data);
      if (!newTenant) throw new Error('תשובת שרת לא תקינה (חשבון חסר)');
      addTenant(newTenant);
      addToast(`חשבון SaaS ${tenantData.name} הוקם בהצלחה!`, 'success');

      setTimeout(async () => {
        try {
          await handleUpdateTenant(newTenant.id, { status: 'Active' });
        } catch {
          // ignore
        }
      }, 3500);
    } catch (e: any) {
      addToast(e?.message || 'שגיאה ביצירת חשבון SaaS', 'error');
      setIsAddTenantOpen(true);
    }
  };

  const handleUpdateTenant = async (id: string, updates: Partial<Tenant>) => {
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const raw: unknown = await res.json().catch(() => null);
    const data = unwrapData(raw);
    if (!res.ok) throw new Error(getStringProp(asObject(data), 'error') || getStringProp(asObject(raw), 'error') || 'שגיאה בעדכון חשבון');
    const updatedTenant = getTenant(data);
    if (!updatedTenant) throw new Error('תשובת שרת לא תקינה (חשבון חסר)');
    updateTenant(id, updatedTenant);
    return updatedTenant;
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Churned' : 'Active';
    try {
      await handleUpdateTenant(id, { status: newStatus });
      addToast('חשבון SaaS עודכן בהצלחה!', 'success');
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בעדכון חשבון SaaS', 'error');
    }
  };

  const handleEditModules = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsModuleModalOpen(true);
  };

  const toggleTenantModule = async (moduleId: ModuleId) => {
    if (!editingTenant) return;
    const current = Array.isArray(editingTenant.modules) ? editingTenant.modules : [];
    const next = current.includes(moduleId) ? current.filter((m) => m !== moduleId) : [...current, moduleId];

    setEditingTenant({ ...editingTenant, modules: next });
    updateTenant(editingTenant.id, { modules: next });

    try {
      await handleUpdateTenant(editingTenant.id, { modules: next });
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בעדכון מודולים', 'error');
    }
  };

  const setTenantModules = async (modules: ModuleId[]) => {
    if (!editingTenant) return;
    const next = Array.isArray(modules) ? modules : [];
    if (next.length === 0) {
      addToast('חייב להיות לפחות מודול אחד פעיל', 'error');
      return;
    }

    setEditingTenant({ ...editingTenant, modules: next });
    updateTenant(editingTenant.id, { modules: next });

    try {
      await handleUpdateTenant(editingTenant.id, { modules: next });
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בעדכון מודולים', 'error');
    }
  };

  const handleSimulateTenant = (tenant: Tenant) => {
    switchToTenantConfig(tenant.modules);
    addToast(`התחזות ל-${tenant.name} פעילה. המודולים עודכנו.`, 'success');
    router.push('/');
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="חשבונות SaaS" subtitle="ניהול חשבונות לקוחות ומודולים" icon={Server} />

      <AdminToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="חפש לפי שם/אימייל בעלים..."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={loadTenants} title="רענון">
              <RefreshCw size={16} />
              רענון
            </Button>
            <Button onClick={() => setIsAddTenantOpen(true)}>הוסף חשבון SaaS</Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-slate-900 font-black">טוען...</div>
        </div>
      ) : null}

      <AnimatePresence>
        {isModuleModalOpen && editingTenant ? (
          <ModuleManagementModal
            tenant={editingTenant}
            products={products}
            onClose={() => setIsModuleModalOpen(false)}
            onToggle={toggleTenantModule}
            onSetModules={setTenantModules}
          />
        ) : null}

        {isAddTenantOpen ? (
          <AddTenantModal onClose={() => setIsAddTenantOpen(false)} onAdd={handleAddTenant} products={products} />
        ) : null}
      </AnimatePresence>

      <TenantsPanel
        tenants={Array.isArray(tenants) ? (tenants as Tenant[]) : []}
        totalMRR={totalMRR}
        activeTenants={activeTenants}
        trialTenants={trialTenants}
        totalUsers={totalUsers}
        filteredTenants={filteredTenants}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddClick={() => setIsAddTenantOpen(true)}
        onSimulate={handleSimulateTenant}
        onEditModules={handleEditModules}
        onToggleStatus={toggleStatus}
        hideHeader
        hideSearch
      />
    </div>
  );
}
