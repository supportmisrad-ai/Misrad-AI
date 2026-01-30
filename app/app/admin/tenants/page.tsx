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

const unwrap = (data: any) =>
  (data as any)?.data && typeof (data as any).data === 'object' ? (data as any).data : data;

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
      const raw = await res.json().catch(() => ({}));
      const data = unwrap(raw);
      if (!res.ok) {
        throw new Error((data as any)?.error || (raw as any)?.error || 'שגיאה בטעינת טננטים');
      }

      const loaded = Array.isArray((data as any).tenants) ? ((data as any).tenants as Tenant[]) : [];
      const existingIds = new Set((Array.isArray(tenants) ? tenants : []).map((t: Tenant) => t.id));
      for (const t of loaded) {
        if (!existingIds.has(t.id)) addTenant(t);
      }
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בטעינת טננטים', 'error');
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
      const ownerEmail = String((t as any).ownerEmail || '').toLowerCase();
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
      const raw = await res.json().catch(() => ({}));
      const data = unwrap(raw);
      if (!res.ok) throw new Error((data as any)?.error || (raw as any)?.error || 'שגיאה ביצירת tenant');

      const newTenant = (data as any).tenant as Tenant;
      addTenant(newTenant);
      addToast(`הלקוח ${tenantData.name} הוקם בהצלחה!`, 'success');

      setTimeout(async () => {
        try {
          await handleUpdateTenant(newTenant.id, { status: 'Active' as any });
        } catch {
          // ignore
        }
      }, 3500);
    } catch (e: any) {
      addToast(e?.message || 'שגיאה ביצירת tenant', 'error');
      setIsAddTenantOpen(true);
    }
  };

  const handleUpdateTenant = async (id: string, updates: Partial<Tenant>) => {
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const raw = await res.json().catch(() => ({}));
    const data = unwrap(raw);
    if (!res.ok) throw new Error((data as any)?.error || (raw as any)?.error || 'שגיאה בעדכון טננט');
    const updatedTenant = (data as any).tenant as Tenant;
    updateTenant(id, updatedTenant);
    return updatedTenant;
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Churned' : 'Active';
    try {
      await handleUpdateTenant(id, { status: newStatus as any });
      addToast('טננט עודכן בהצלחה!', 'success');
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בעדכון טננט', 'error');
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

  const handleSimulateTenant = (tenant: Tenant) => {
    switchToTenantConfig(tenant.modules);
    addToast(`התחזות ל-${tenant.name} פעילה. המודולים עודכנו.`, 'success');
    router.push('/');
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="טננטים" subtitle="לקוחות SaaS + ניהול מודולים" icon={Server} />

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
            <Button onClick={() => setIsAddTenantOpen(true)}>הוסף טננט</Button>
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
          <ModuleManagementModal tenant={editingTenant} onClose={() => setIsModuleModalOpen(false)} onToggle={toggleTenantModule} />
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
