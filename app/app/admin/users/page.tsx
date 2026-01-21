'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAdminClients, impersonateUser } from '@/app/actions/admin';
import { useData } from '@/context/DataContext';

type AdminClientRow = {
  id: string;
  companyName: string;
  fullName: string;
  email: string | null;
  organizationId: string | null;
  createdAt: string | null;
};

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
      setRows((res.data || []) as any);
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
      addToast('לא נמצא organizationId ללקוח (לא ניתן לנווט ל-workspace)', 'error');
      return;
    }

    try {
      const res = await impersonateUser(clientId);
      if (!res.success) {
        addToast(res.error || 'שגיאה בהתחזות', 'error');
        return;
      }

      addToast('נכנסת למצב התחזות - מעביר ל-workspace של הלקוח...', 'success');
      router.push(
        `/w/${encodeURIComponent(String(orgSlug))}/social/workspace?clientId=${encodeURIComponent(String(clientId))}`
      );
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בהתחזות', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-2xl font-black text-slate-900">משתמשים</div>
          <div className="text-sm font-bold text-slate-500 mt-1">לקוחות (client_clients) + התחזות</div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפש לפי חברה/שם/מייל..."
            className="w-full md:w-72 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={load}
            className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50"
            title="רענון"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
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
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-sm font-bold text-slate-600" colSpan={4}>
                    טוען...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm font-bold text-slate-600" colSpan={4}>
                    לא נמצאו לקוחות
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{u.companyName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{u.fullName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => handleImpersonate(u.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black hover:bg-indigo-100"
                        title="Impersonate"
                      >
                        <Eye size={16} />
                        התחזות
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
