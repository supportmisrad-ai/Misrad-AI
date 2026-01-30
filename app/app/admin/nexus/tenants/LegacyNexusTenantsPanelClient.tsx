'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Tenant, ModuleId, Product } from '@/types';
import { useData } from '@/context/DataContext';
import { TenantsPanel } from '@/components/saas/TenantsPanel';
import { AddTenantModal } from '@/components/saas/AddTenantModal';
import { ModuleManagementModal } from '@/components/saas/ModuleManagementModal';
import { getSystemMetrics } from '@/app/actions/admin';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

const unwrap = (data: any) =>
  (data as any)?.data && typeof (data as any).data === 'object' ? (data as any).data : data;

export default function LegacyNexusTenantsPanelClient(props: {
  navigateAction?: (path: string) => void;
}) {
  const {
    tenants,
    addTenant,
    updateTenant,
    deleteTenant,
    products,
    addToast,
    switchToTenantConfig,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [adminSystemMetrics, setAdminSystemMetrics] = useState<any>(null);

  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getSystemMetrics();
        if (!cancelled && res?.success && res.data) {
          setAdminSystemMetrics(res.data);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const safeTenants = useMemo(() => (Array.isArray(tenants) ? (tenants as Tenant[]) : []), [tenants]);

  const totalMRR = safeTenants.filter((t) => t.status === 'Active').reduce((acc, t) => acc + Number(t.mrr || 0), 0);
  const activeTenants = safeTenants.filter((t) => t.status === 'Active').length;
  const trialTenants = safeTenants.filter((t) => t.status === 'Trial').length;
  const totalUsers = safeTenants.reduce((acc, t) => acc + Number(t.usersCount || 0), 0);

  const filteredTenants = safeTenants.filter((t) => {
    const name = String((t as any)?.name || '').toLowerCase();
    const email = String((t as any)?.ownerEmail || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleAddTenant = async (
    tenantData: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'modules' | 'status' | 'usersCount' | 'mrr'> & { modules?: ModuleId[] },
    mrr: number
  ) => {
    setIsAddTenantOpen(false);
    addToast?.(`מקים סביבת עבודה ב-${(tenantData as any).region}...`, 'info');

    try {
      let tenantModules: ModuleId[] = (tenantData as any).modules || (['crm', 'team'] as any);
      if (!(tenantData as any).modules) {
        const selectedProduct = (products as Product[]).find((p: Product) => p.name === (tenantData as any).plan);
        if ((selectedProduct as any)?.modules) {
          tenantModules = (selectedProduct as any).modules as ModuleId[];
        }
      }

      const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
        },
        body: JSON.stringify({
          ...(tenantData as any),
          mrr,
          status: 'Provisioning',
          modules: tenantModules,
          logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(String((tenantData as any).name || ''))}&background=6366f1&color=fff`,
        }),
      });

      if (!response.ok) {
        const raw = await response.json().catch(() => ({}));
        const payload = unwrap(raw);
        throw new Error((payload as any)?.error || (raw as any)?.error || 'שגיאה ביצירת tenant');
      }

      const raw = await response.json().catch(() => ({}));
      const payload = unwrap(raw);
      const newTenant = (payload as any).tenant;

      addTenant?.(newTenant);
      addToast?.(`הלקוח ${(tenantData as any).name} הוקם בהצלחה!`, 'success');

      setTimeout(async () => {
        try {
          await handleUpdateTenant(String(newTenant.id), { status: 'Active' } as any);
        } catch {
          // ignore
        }
      }, 3500);
    } catch (error: any) {
      console.error('[LegacyNexusTenants] Error creating tenant:', error);
      addToast?.(error?.message || 'שגיאה ביצירת tenant', 'error');
      setIsAddTenantOpen(true);
    }
  };

  const handleUpdateTenant = async (id: string, updates: Partial<Tenant>) => {
    const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
    const response = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const raw = await response.json().catch(() => ({}));
      const payload = unwrap(raw);
      throw new Error((payload as any)?.error || (raw as any)?.error || 'שגיאה בעדכון tenant');
    }

    const raw = await response.json().catch(() => ({}));
    const payload = unwrap(raw);
    const updatedTenant = (payload as any).tenant;

    updateTenant?.(id, updatedTenant);
    addToast?.('Tenant עודכן בהצלחה!', 'success');
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Churned' : 'Active';
    try {
      await handleUpdateTenant(id, { status: newStatus as any });
    } catch {
      // ignore
    }
  };

  const handleEditModules = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsModuleModalOpen(true);
  };

  const toggleTenantModule = (moduleId: ModuleId) => {
    if (!editingTenant) return;
    const currentModules = (editingTenant as any).modules || [];

    let newModules: ModuleId[];
    if (currentModules.includes(moduleId)) {
      newModules = currentModules.filter((m: ModuleId) => m !== moduleId);
    } else {
      newModules = [...currentModules, moduleId];
    }

    updateTenant?.(String((editingTenant as any).id), { modules: newModules } as any);
    setEditingTenant({ ...(editingTenant as any), modules: newModules } as any);
  };

  const handleSimulateTenant = (tenant: Tenant) => {
    switchToTenantConfig?.((tenant as any).modules);
    addToast?.(`התחזות ל-${(tenant as any).name} פעילה. המודולים עודכנו.`, 'success');

    if (props.navigateAction) {
      props.navigateAction('/');
    } else {
      try {
        window.location.href = '/';
      } catch {
        // ignore
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isModuleModalOpen && editingTenant ? (
          <ModuleManagementModal
            tenant={editingTenant as any}
            onClose={() => setIsModuleModalOpen(false)}
            onToggle={toggleTenantModule as any}
          />
        ) : null}

        {isAddTenantOpen ? (
          <AddTenantModal onClose={() => setIsAddTenantOpen(false)} onAdd={handleAddTenant as any} products={products as any} />
        ) : null}
      </AnimatePresence>

      <TenantsPanel
        tenants={safeTenants as any}
        totalMRR={totalMRR}
        activeTenants={activeTenants}
        trialTenants={trialTenants}
        totalUsers={totalUsers}
        mrrTrendPct={adminSystemMetrics?.trends?.mrr ?? null}
        apiHealthScore={adminSystemMetrics?.apiHealthScore ?? null}
        filteredTenants={filteredTenants as any}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddClick={() => setIsAddTenantOpen(true)}
        onSimulate={handleSimulateTenant as any}
        onEditModules={handleEditModules as any}
        onToggleStatus={toggleStatus as any}
      />
    </>
  );
}
