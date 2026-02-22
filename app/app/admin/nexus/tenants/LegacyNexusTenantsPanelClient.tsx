'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Tenant, ModuleId, SaasPlan } from '@/types';
import { useData } from '@/context/DataContext';
import { TenantsPanel } from '@/components/saas/TenantsPanel';
import { AddTenantModal } from '@/components/saas/AddTenantModal';
import { ModuleManagementModal } from '@/components/saas/ModuleManagementModal';
import { getSystemMetrics } from '@/app/actions/admin';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { asObject } from '@/lib/shared/unknown';
import { extractData, extractError } from '@/lib/shared/api-types';

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === 'string' ? v : v == null ? null : String(v);
}

function isTenantStatus(value: unknown): value is Tenant['status'] {
  return value === 'Active' || value === 'Trial' || value === 'Churned' || value === 'Provisioning';
}

function isTenantRegion(value: unknown): value is NonNullable<Tenant['region']> {
  return value === 'il-central' || value === 'eu-west' || value === 'us-east';
}

function isModuleId(value: unknown): value is ModuleId {
  return (
    value === 'crm' ||
    value === 'finance' ||
    value === 'ai' ||
    value === 'team' ||
    value === 'content' ||
    value === 'assets' ||
    value === 'operations'
  );
}

function coerceModules(value: unknown): ModuleId[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x)).filter(isModuleId);
}

function parseTenant(value: unknown): Tenant | null {
  const obj = asObject(value);
  const id = getStringProp(obj, 'id');
  if (!obj || !id) return null;

  const statusRaw = getStringProp(obj, 'status');
  const status: Tenant['status'] = isTenantStatus(statusRaw) ? statusRaw : 'Provisioning';

  const regionRaw = getStringProp(obj, 'region');
  const region: Tenant['region'] = isTenantRegion(regionRaw) ? regionRaw : undefined;

  const logoValue = obj['logo'];
  const logo = typeof logoValue === 'string' && logoValue ? logoValue : undefined;

  const versionValue = obj['version'];
  const version = typeof versionValue === 'string' && versionValue ? versionValue : undefined;

  const allowedEmailsValue = obj['allowedEmails'];
  const allowedEmails = Array.isArray(allowedEmailsValue) ? allowedEmailsValue.map((x) => String(x)) : [];

  const phoneValue = obj['phone'];
  const phone = typeof phoneValue === 'string' && phoneValue ? phoneValue : undefined;

  const maxUsersValue = obj['maxUsers'];
  const maxUsers = typeof maxUsersValue === 'number' && Number.isFinite(maxUsersValue) ? maxUsersValue : maxUsersValue != null ? Number(maxUsersValue) : undefined;

  const defaultLanguageValue = obj['defaultLanguage'];
  const defaultLanguage = typeof defaultLanguageValue === 'string' && defaultLanguageValue ? defaultLanguageValue : undefined;

  const activationDateValue = obj['activationDate'];
  const activationDate = typeof activationDateValue === 'string' && activationDateValue ? activationDateValue : undefined;

  const notesValue = obj['notes'];
  const notes = typeof notesValue === 'string' && notesValue ? notesValue : undefined;

  return {
    id,
    name: getStringProp(obj, 'name') ?? '',
    ownerEmail: getStringProp(obj, 'ownerEmail') ?? '',
    subdomain: getStringProp(obj, 'subdomain') ?? '',
    plan: getStringProp(obj, 'plan') ?? '',
    status,
    joinedAt: getStringProp(obj, 'joinedAt') ?? '',
    mrr: Number(obj['mrr'] ?? 0) || 0,
    usersCount: Number(obj['usersCount'] ?? 0) || 0,
    logo,
    modules: coerceModules(obj['modules']),
    region,
    version,
    allowedEmails,
    requireApproval: Boolean(obj['requireApproval'] ?? false),
    phone,
    maxUsers,
    defaultLanguage,
    activationDate,
    notes,
  };
}

function getTenantFromResponse(value: unknown): Tenant | null {
  const data = extractData(value);
  const obj = asObject(data) ?? asObject(value);
  if (!obj) return null;
  return parseTenant(obj.tenant);
}

export default function LegacyNexusTenantsPanelClient(props: {
  navigateAction?: (path: string) => void;
}) {
  const {
    tenants,
    addTenant,
    updateTenant,
    products,
    addToast,
    switchToTenantConfig,
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  type SystemMetricsData = NonNullable<Awaited<ReturnType<typeof getSystemMetrics>>['data']>;
  const [adminSystemMetrics, setAdminSystemMetrics] = useState<SystemMetricsData | null>(null);

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

  const safeTenants = useMemo<Tenant[]>(() => (Array.isArray(tenants) ? tenants : []), [tenants]);

  const totalMRR = safeTenants.filter((t) => t.status === 'Active').reduce((acc, t) => acc + Number(t.mrr || 0), 0);
  const activeTenants = safeTenants.filter((t) => t.status === 'Active').length;
  const trialTenants = safeTenants.filter((t) => t.status === 'Trial').length;
  const totalUsers = safeTenants.reduce((acc, t) => acc + Number(t.usersCount || 0), 0);

  const filteredTenants = safeTenants.filter((t) => {
    const name = String(t.name || '').toLowerCase();
    const email = String(t.ownerEmail || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleAddTenant = async (
    tenantData: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'modules' | 'status' | 'usersCount' | 'mrr'> & { modules?: ModuleId[] },
    mrr: number
  ) => {
    setIsAddTenantOpen(false);
    addToast?.(`מקים סביבת עבודה ב-${String(tenantData.region || 'il-central')}...`, 'info');

    try {
      let tenantModules: ModuleId[] = Array.isArray(tenantData.modules) ? tenantData.modules : ['crm', 'team'];
      if (!tenantData.modules) {
        const matchedPlan = (Array.isArray(products) ? products : [] as SaasPlan[]).find((p) => p.name === tenantData.plan) as SaasPlan | undefined;
        if (Array.isArray(matchedPlan?.modules) && matchedPlan.modules.length > 0) {
          tenantModules = matchedPlan.modules;
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
          ...tenantData,
          mrr,
          status: 'Provisioning',
          modules: tenantModules,
          logo: '',
        }),
      });

      if (!response.ok) {
        const raw: unknown = await response.json().catch(() => null);
        const data = extractData(raw);
        throw new Error(extractError(raw) || extractError(data) || 'שגיאה ביצירת tenant');
      }

      const raw: unknown = await response.json().catch(() => null);
      const newTenant = getTenantFromResponse(raw);
      if (!newTenant) throw new Error('תשובת שרת לא תקינה (tenant חסר)');

      addTenant?.(newTenant);
      addToast?.(`הלקוח ${tenantData.name} הוקם בהצלחה!`, 'success');

      setTimeout(async () => {
        try {
          await handleUpdateTenant(String(newTenant.id), { status: 'Active' });
        } catch {
          // ignore
        }
      }, 3500);
    } catch (error: unknown) {
      console.error('[LegacyNexusTenants] Error creating tenant:', error);
      addToast?.(error instanceof Error ? error.message : 'שגיאה ביצירת tenant', 'error');
      setIsAddTenantOpen(true);
    }
  };

  const handleUpdateTenant = async (id: string, updates: Partial<Tenant>): Promise<Tenant> => {
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
      const raw: unknown = await response.json().catch(() => null);
      const data = extractData(raw);
      throw new Error(extractError(raw) || extractError(data) || 'שגיאה בעדכון tenant');
    }

    const raw: unknown = await response.json().catch(() => null);
    const updatedTenant = getTenantFromResponse(raw);
    if (!updatedTenant) throw new Error('תשובת שרת לא תקינה (tenant חסר)');

    updateTenant?.(id, updatedTenant);
    addToast?.('Tenant עודכן בהצלחה!', 'success');
    return updatedTenant;
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus: Tenant['status'] = currentStatus === 'Active' ? 'Churned' : 'Active';
    try {
      await handleUpdateTenant(id, { status: newStatus });
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
    const tenantId = editingTenant.id;
    const currentModules = Array.isArray(editingTenant.modules) ? editingTenant.modules : [];

    let newModules: ModuleId[];
    if (currentModules.includes(moduleId)) {
      newModules = currentModules.filter((m: ModuleId) => m !== moduleId);
    } else {
      newModules = [...currentModules, moduleId];
    }

    updateTenant?.(tenantId, { modules: newModules });
    setEditingTenant({ ...editingTenant, modules: newModules });

    Promise.resolve()
      .then(() => handleUpdateTenant(tenantId, { modules: newModules }))
      .catch((e: unknown) => {
        addToast?.(e instanceof Error ? e.message : 'שגיאה בעדכון מודולים', 'error');
      });
  };

  const setTenantModules = async (modules: ModuleId[]) => {
    if (!editingTenant) return;
    const next = Array.isArray(modules) ? modules : [];
    if (next.length === 0) {
      addToast?.('חייב להיות לפחות מודול אחד פעיל', 'error');
      return;
    }

    updateTenant?.(editingTenant.id, { modules: next });
    setEditingTenant({ ...editingTenant, modules: next });

    try {
      await handleUpdateTenant(editingTenant.id, { modules: next });
    } catch (e: unknown) {
      addToast?.(e instanceof Error ? e.message : 'שגיאה בעדכון מודולים', 'error');
    }
  };

  const handleSimulateTenant = (tenant: Tenant) => {
    switchToTenantConfig?.(tenant.modules);
    addToast?.(`התחזות ל-${tenant.name} פעילה. המודולים עודכנו.`, 'success');

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
            tenant={editingTenant}
            products={Array.isArray(products) ? products as unknown as SaasPlan[] : []}
            onClose={() => setIsModuleModalOpen(false)}
            onToggle={toggleTenantModule}
            onSetModules={setTenantModules}
          />
        ) : null}

        {isAddTenantOpen ? (
          <AddTenantModal onClose={() => setIsAddTenantOpen(false)} onAdd={handleAddTenant} products={Array.isArray(products) ? products as unknown as SaasPlan[] : []} />
        ) : null}
      </AnimatePresence>

      <TenantsPanel
        tenants={safeTenants}
        totalMRR={totalMRR}
        activeTenants={activeTenants}
        trialTenants={trialTenants}
        totalUsers={totalUsers}
        mrrTrendPct={adminSystemMetrics?.trends?.mrr ?? null}
        apiHealthScore={adminSystemMetrics?.apiHealthScore ?? null}
        filteredTenants={filteredTenants}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddClick={() => setIsAddTenantOpen(true)}
        onSimulate={handleSimulateTenant}
        onEditModules={handleEditModules}
        onToggleStatus={toggleStatus}
      />
    </>
  );
}
