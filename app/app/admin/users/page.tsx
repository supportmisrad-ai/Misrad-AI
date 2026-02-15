'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAdminClients, impersonateUser } from '@/app/actions/admin';
import type { AdminClientLite } from '@/app/actions/admin';
import { useData } from '@/context/DataContext';
import { SkeletonTable } from '@/components/ui/skeletons';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { Button } from '@/components/ui/button';

type AdminClientRow = AdminClientLite;

export default function AdminUsersPage() {
  const { addToast } = useData();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<AdminClientRow[]>([]);
  const [query, setQuery] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminClients({ query, limit: 200 });
      if (!res.success) {
        addToast(res.error || 'שגיאה בטעינת לקוחות', 'error');
        setRows([]);
        return;
      }
      setRows(res.data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const company = String(r.companyName || '').toLowerCase();
      const fullName = String(r.fullName || '').toLowerCase();
      const email = String(r.email || '').toLowerCase();
      return company.includes(q) || fullName.includes(q) || email.includes(q);
    });
  }, [query, rows]);

  const handleImpersonate = async (clientId: string) => {
    const row = rows.find((r) => r.id === clientId) || null;
    const orgSlug = row?.organizationId;
    if (!orgSlug) {
      addToast('לא נמצא מזהה מרחב עבודה ללקוח (לא ניתן לנווט למרחב העבודה)', 'error');
      return;
    }

    try {
      const res = await impersonateUser(clientId);
      if (!res.success) {
        addToast(res.error || 'שגיאה בהתחזות', 'error');
        return;
      }

      addToast('נכנסת למצב התחזות - מעביר למרחב העבודה של הלקוח...', 'success');
      router.push(
        `/w/${encodeURIComponent(String(orgSlug))}/social/workspace?clientId=${encodeURIComponent(String(clientId))}`
      );
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בהתחזות', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader title="חשבונות מערכת (מנויים)" subtitle="לקוחות מערכת לצורכי מנוי/תמיכה/התחזות" icon={Users} />

      <AdminToolbar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="חפש לפי חברה/שם/מייל..."
        actions={
          <Button variant="outline" onClick={load} title="רענון">
            <RefreshCw size={16} />
            רענון
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonTable rows={10} columns={4} />
      ) : (
        <div className="space-y-3">
          <div className="md:hidden">
            {filtered.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-600">לא נמצאו לקוחות מערכת</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((u) => (
                  <div key={u.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="text-sm font-black text-slate-900 truncate">{u.companyName}</div>
                    <div className="mt-1 text-xs font-bold text-slate-600 truncate">איש קשר: {u.fullName}</div>
                    <div className="mt-1 text-xs font-bold text-slate-600 truncate">אימייל: {u.email || '-'}</div>
                    <div className="mt-3">
                      <Button className="w-full" onClick={() => handleImpersonate(u.id)} title="התחזות">
                        <Eye size={16} />
                        התחזות
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">חברה</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">איש קשר</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">אימייל</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm font-bold text-slate-600" colSpan={4}>
                        לא נמצאו לקוחות מערכת
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">{u.companyName}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{u.fullName}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{u.email || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <Button variant="outline" size="sm" onClick={() => handleImpersonate(u.id)} title="התחזות">
                            <Eye size={16} />
                            התחזות
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
