'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Edit, Plus, Save, X, RefreshCw, Upload } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import {
  createOrganization,
  getOrganizations,
  getSocialUsersLite,
  setOrganizationOwner,
  updateOrganization,
  type OrganizationWithOwner,
  type SocialUserLite,
} from '@/app/actions/admin-organizations';

type CreateFormState = {
  name: string;
  slug: string;
  ownerUserId: string;
  has_nexus: boolean;
  has_social: boolean;
  has_system: boolean;
  has_finance: boolean;
  has_client: boolean;
  has_operations: boolean;
};

type EditFormState = {
  organizationId: string;
  name: string;
  slug: string;
  has_nexus: boolean;
  has_social: boolean;
  has_system: boolean;
  has_finance: boolean;
  has_client: boolean;
  has_operations: boolean;
};

function bool(v: any): boolean {
  return v === true;
}

export default function OrganizationsTab() {
  const { addToast } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [organizations, setOrganizations] = useState<OrganizationWithOwner[]>([]);
  const [usersQuery, setUsersQuery] = useState('');
  const [users, setUsers] = useState<SocialUserLite[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    name: '',
    slug: '',
    ownerUserId: '',
    has_nexus: true,
    has_social: false,
    has_system: false,
    has_finance: false,
    has_client: false,
    has_operations: false,
  });

  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoOrgId, setLogoOrgId] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const filteredOrganizations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) => {
      const name = (o.name || '').toLowerCase();
      const slug = (o.slug || '').toLowerCase();
      const ownerEmail = (o.owner?.email || '').toLowerCase();
      return name.includes(q) || slug.includes(q) || ownerEmail.includes(q);
    });
  }, [organizations, query]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [orgsRes, usersRes] = await Promise.all([
        getOrganizations({ limit: 500 }),
        getSocialUsersLite({ query: usersQuery, limit: 500 }),
      ]);

      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data);
      } else {
        addToast(orgsRes.error || 'שגיאה בטעינת ארגונים', 'error');
      }

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      } else {
        addToast(usersRes.error || 'שגיאה בטעינת משתמשים', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (org: OrganizationWithOwner) => {
    setEditingOrgId(org.id);
    setEditForm({
      organizationId: org.id,
      name: org.name || '',
      slug: org.slug || '',
      has_nexus: bool(org.has_nexus),
      has_social: bool(org.has_social),
      has_system: bool(org.has_system),
      has_finance: bool(org.has_finance),
      has_client: bool(org.has_client),
      has_operations: bool((org as any).has_operations),
    });
  };

  const cancelEdit = () => {
    setEditingOrgId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editForm) return;

    const res = await updateOrganization({
      organizationId: editForm.organizationId,
      name: editForm.name,
      slug: editForm.slug,
      has_nexus: editForm.has_nexus,
      has_social: editForm.has_social,
      has_system: editForm.has_system,
      has_finance: editForm.has_finance,
      has_client: editForm.has_client,
      has_operations: editForm.has_operations,
    });

    if (!res.success) {
      addToast(res.error || 'שגיאה בעדכון ארגון', 'error');
      return;
    }

    addToast('הארגון עודכן בהצלחה', 'success');
    cancelEdit();
    await load();
  };

  const emergencyDisableFinance = async () => {
    if (!editForm) return;

    try {
      const res = await updateOrganization({
        organizationId: editForm.organizationId,
        has_finance: false,
      });

      if (!res.success) {
        addToast(res.error || 'שגיאה בכיבוי Finance', 'error');
        return;
      }

      await fetch('/api/system/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: editForm.organizationId,
          screenId: 'reports',
          status: 'hidden',
        }),
      });

      addToast('Finance כובה (חירום) + reports הוסתר', 'success');
      cancelEdit();
      await load();
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בכיבוי חירום', 'error');
    }
  };

  const createOrg = async () => {
    if (!createForm.name.trim()) {
      addToast('שם ארגון חובה', 'error');
      return;
    }
    if (!createForm.ownerUserId) {
      addToast('חובה לבחור Owner', 'error');
      return;
    }

    const res = await createOrganization({
      name: createForm.name,
      slug: createForm.slug || undefined,
      ownerUserId: createForm.ownerUserId,
      has_nexus: createForm.has_nexus,
      has_social: createForm.has_social,
      has_system: createForm.has_system,
      has_finance: createForm.has_finance,
      has_client: createForm.has_client,
      has_operations: createForm.has_operations,
    });

    if (!res.success) {
      addToast(res.error || 'שגיאה ביצירת ארגון', 'error');
      return;
    }

    addToast('ארגון נוצר בהצלחה', 'success');
    setIsCreateOpen(false);
    setCreateForm({
      name: '',
      slug: '',
      ownerUserId: '',
      has_nexus: true,
      has_social: false,
      has_system: false,
      has_finance: false,
      has_client: false,
      has_operations: false,
    });
    await load();
  };

  const updateOwner = async (organizationId: string, ownerUserId: string) => {
    const res = await setOrganizationOwner({ organizationId, ownerUserId });
    if (!res.success) {
      addToast(res.error || 'שגיאה בעדכון Owner', 'error');
      return;
    }
    addToast('Owner עודכן בהצלחה', 'success');
    await load();
  };

  const triggerLogoUpload = (organizationId: string) => {
    setLogoOrgId(organizationId);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
      logoInputRef.current.click();
    }
  };

  const handleLogoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const orgId = logoOrgId;
    const file = e.target.files?.[0];
    if (!orgId || !file) return;

    try {
      setIsUploadingLogo(true);

      const form = new FormData();
      form.append('file', file);
      form.append('bucket', 'attachments');
      form.append('folder', 'org-logos');
      form.append('userId', orgId);

      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: form,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err?.error || 'שגיאה בהעלאת קובץ');
      }

      const uploaded = await uploadRes.json().catch(() => null);
      const url = String(uploaded?.url || '');
      if (!url) throw new Error('שגיאה: לא התקבל URL לאחר העלאה');

      const saveRes = await updateOrganization({ organizationId: orgId, logo: url });
      if (!saveRes.success) {
        throw new Error(saveRes.error || 'שגיאה בשמירת לוגו לארגון');
      }

      addToast('לוגו הארגון עודכן בהצלחה', 'success');
      await load();
    } catch (err: any) {
      addToast(err?.message || 'שגיאה בהעלאת לוגו', 'error');
    } finally {
      setIsUploadingLogo(false);
      setLogoOrgId(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  return (
    <motion.div key="organizations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
              <Building2 className="text-indigo-600" size={22} />
              ארגונים (Tenants)
            </h3>
            <p className="text-sm text-slate-600">ניהול מלא של Tenants: יצירה, flags, Owner</p>
          </div>

          <div className="flex gap-4 items-center">
            <input
              placeholder="חפש ארגון / slug / owner אימייל..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white border border-indigo-200 rounded-xl px-6 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400 text-right shadow-sm w-80"
            />

            <button
              onClick={() => load()}
              className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-indigo-500 hover:text-white transition-all"
              title="רענון"
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'opacity-60' : undefined} />
            </button>

            <button
              onClick={() => setIsCreateOpen((v) => !v)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-xl font-black text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md flex items-center gap-2"
            >
              <Plus size={18} />
              ארגון חדש
            </button>
          </div>
        </div>

        {isCreateOpen && (
          <div className="p-8 border-b border-indigo-100 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                placeholder="שם ארגון"
                value={createForm.name}
                onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                className="bg-white border border-indigo-200 rounded-xl px-4 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400"
              />
              <input
                placeholder="slug (אופציונלי)"
                value={createForm.slug}
                onChange={(e) => setCreateForm((s) => ({ ...s, slug: e.target.value }))}
                className="bg-white border border-indigo-200 rounded-xl px-4 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400"
              />
              <select
                value={createForm.ownerUserId}
                onChange={(e) => setCreateForm((s) => ({ ...s, ownerUserId: e.target.value }))}
                className="bg-white border border-indigo-200 rounded-xl px-4 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400"
              >
                <option value="">בחר Owner (social_users)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.full_name || u.email || u.clerk_user_id) + (u.email ? ` (${u.email})` : '')}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
              {([
                ['has_nexus', 'Nexus'],
                ['has_social', 'Social'],
                ['has_system', 'System'],
                ['has_finance', 'Finance'],
                ['has_client', 'Client'],
                ['has_operations', 'Operations'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={(createForm as any)[key]}
                    onChange={(e) => setCreateForm((s) => ({ ...s, [key]: e.target.checked } as any))}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={createOrg}
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-sm hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
              >
                <Save size={18} />
                צור ארגון
              </button>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="bg-slate-100 text-slate-700 px-6 py-2 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoFileSelected}
          />

          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b border-indigo-100">
                <th className="p-6 text-[10px] font-black text-slate-600 uppercase">שם</th>
                <th className="p-6 text-[10px] font-black text-slate-600 uppercase">Slug</th>
                <th className="p-6 text-[10px] font-black text-slate-600 uppercase">Owner</th>
                <th className="p-6 text-[10px] font-black text-slate-600 uppercase">מודולים</th>
                <th className="p-6 text-[10px] font-black text-slate-600 uppercase">משתמשים</th>
                <th className="p-6 text-[10px] font-black text-slate-600 uppercase">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations.map((org) => {
                const isEditing = editingOrgId === org.id;
                return (
                  <tr key={org.id} className="border-b border-indigo-50 hover:bg-indigo-50/50 transition-colors group">
                    <td className="p-6 align-top">
                      {isEditing ? (
                        <input
                          value={editForm?.name || ''}
                          onChange={(e) => setEditForm((s) => (s ? { ...s, name: e.target.value } : s))}
                          className="bg-white border border-indigo-200 rounded-xl px-4 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400 w-full"
                        />
                      ) : (
                        <div className="flex items-start gap-3">
                          <img
                            src={org.logo || '/icons/misrad-icon.svg'}
                            alt={org.name || 'org'}
                            className="w-10 h-10 rounded-xl border border-indigo-100 bg-white object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                          <div>
                            <p className="font-black text-slate-900">{org.name}</p>
                            <p className="text-xs text-slate-500 font-bold">{org.id}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-6 align-top">
                      {isEditing ? (
                        <input
                          value={editForm?.slug || ''}
                          onChange={(e) => setEditForm((s) => (s ? { ...s, slug: e.target.value } : s))}
                          className="bg-white border border-indigo-200 rounded-xl px-4 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400 w-full"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-700">{org.slug || '-'}</p>
                      )}
                    </td>

                    <td className="p-6 align-top">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-bold text-slate-700">{org.owner?.email || org.owner_id}</p>
                        <select
                          value={org.owner_id}
                          onChange={(e) => updateOwner(org.id, e.target.value)}
                          className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:border-indigo-400"
                        >
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {(u.full_name || u.email || u.clerk_user_id) + (u.email ? ` (${u.email})` : '')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="p-6 align-top">
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            ['has_nexus', 'Nexus'],
                            ['has_social', 'Social'],
                            ['has_system', 'System'],
                            ['has_finance', 'Finance'],
                            ['has_client', 'Client'],
                            ['has_operations', 'Operations'],
                          ] as const).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={(editForm as any)?.[key] || false}
                                onChange={(e) => setEditForm((s) => (s ? ({ ...s, [key]: e.target.checked } as any) : s))}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {bool(org.has_nexus) && <span className="px-2 py-1 rounded-lg text-[9px] font-black bg-indigo-100 text-indigo-700">NEXUS</span>}
                          {bool(org.has_social) && <span className="px-2 py-1 rounded-lg text-[9px] font-black bg-purple-100 text-purple-700">SOCIAL</span>}
                          {bool(org.has_system) && <span className="px-2 py-1 rounded-lg text-[9px] font-black bg-blue-100 text-blue-700">SYSTEM</span>}
                          {bool(org.has_finance) && <span className="px-2 py-1 rounded-lg text-[9px] font-black bg-emerald-100 text-emerald-700">FINANCE</span>}
                          {bool(org.has_client) && <span className="px-2 py-1 rounded-lg text-[9px] font-black bg-amber-100 text-amber-700">CLIENT</span>}
                          {bool((org as any).has_operations) && (
                            <span className="px-2 py-1 rounded-lg text-[9px] font-black bg-sky-100 text-sky-700">OPERATIONS</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-6 align-top">
                      <p className="text-sm font-bold text-slate-700">{org.membersCount ?? 0}</p>
                    </td>

                    <td className="p-6 align-top">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {!isEditing ? (
                          <button
                            onClick={() => startEdit(org)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-500 hover:text-white transition-all"
                            title="ערוך"
                          >
                            <Edit size={16} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => triggerLogoUpload(org.id)}
                              className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                              title="העלה/החלף לוגו"
                              disabled={isUploadingLogo}
                            >
                              <Upload size={16} className={isUploadingLogo && logoOrgId === org.id ? 'opacity-60' : ''} />
                            </button>
                            {(editForm as any)?.has_finance && (
                              <button
                                onClick={emergencyDisableFinance}
                                className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                                title="כיבוי חירום Finance (מיידי)"
                              >
                                <X size={16} />
                              </button>
                            )}
                            <button
                              onClick={saveEdit}
                              className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                              title="שמור"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                              title="בטל"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredOrganizations.length === 0 && (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <p className="text-slate-600 font-bold">אין ארגונים</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
