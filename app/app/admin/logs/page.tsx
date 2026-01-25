'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import { getSecurityAuditLog } from '@/app/actions/admin';
import { useData } from '@/context/DataContext';
import { SkeletonTable } from '@/components/ui/skeletons';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { Button } from '@/components/ui/button';

type AuditItem = {
  action: string;
  user: string;
  time: string;
  timestamp: string;
};

export default function AdminLogsPage() {
  const { addToast } = useData();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<AuditItem[]>([]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getSecurityAuditLog({ limit: 100, offset: 0 });
      if (!res.success) {
        addToast(res.error || 'שגיאה בטעינת לוגים', 'error');
        setItems([]);
        return;
      }
      setItems((res.data || []) as any);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader title="לוגים" subtitle="Audit Log" icon={ScrollText} />

      <AdminToolbar
        actions={
          <Button variant="outline" onClick={load}>
            <RefreshCw size={16} />
            רענון
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonTable rows={8} columns={3} />
      ) : (
        <div className="space-y-3">
          <div className="md:hidden">
            {items.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-600">אין נתונים</div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={`${it.timestamp}_${idx}`} className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="text-xs font-black text-slate-500">{it.time}</div>
                    <div className="mt-1 text-sm font-black text-slate-900 truncate">{it.user}</div>
                    <div className="mt-1 text-xs font-bold text-slate-600">{it.action}</div>
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
                    <th className="px-4 py-3 text-xs font-black text-slate-600">זמן</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">משתמש</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">פעולה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm font-bold text-slate-600" colSpan={3}>
                        אין נתונים
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={`${it.timestamp}_${idx}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">{it.time}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">{it.user}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{it.action}</td>
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
