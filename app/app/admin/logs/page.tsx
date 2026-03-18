'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import { getSecurityAuditLog } from '@/app/actions/admin';
import { useData } from '@/context/DataContext';
import { SkeletonTable } from '@/components/ui/skeletons';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { Button } from '@/components/ui/button';

import { asObject } from '@/lib/shared/unknown';
type AuditItem = {
  action: string;
  user: string;
  time: string;
  timestamp: string;
};


function toAuditItem(row: unknown): AuditItem {
  const obj = asObject(row) ?? {};
  return {
    action: String(obj.action ?? ''),
    user: String(obj.user ?? ''),
    time: String(obj.time ?? ''),
    timestamp: String(obj.timestamp ?? ''),
  };
}

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
      setItems((res.data || []).map(toAuditItem));
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
      <AdminPageHeader title="לוגים" subtitle="יומן פעילות מערכת" icon={ScrollText} />

      <AdminToolbar
        actions={
          <Button variant="outline" onClick={load}>
            <RefreshCw size={16} />
            רענון
          </Button>
        }
      />

      {isLoading ? (
        <div className="admin-pro-card p-8">
          <SkeletonTable rows={8} columns={3} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="md:hidden">
            {items.length === 0 ? (
              <div className="admin-pro-card p-8 text-center text-sm font-bold text-slate-500">אין נתונים</div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={`${it.timestamp}_${idx}`} className="admin-pro-card p-4">
                    <div className="text-xs font-black text-slate-400">{it.time}</div>
                    <div className="mt-1 text-sm font-black text-slate-900 truncate">{it.user}</div>
                    <div className="mt-1 text-xs font-bold text-slate-600">{it.action}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block admin-pro-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-right">
                <thead>
                  <tr>
                    <th className="admin-table-header w-48">זמן</th>
                    <th className="admin-table-header w-64">משתמש</th>
                    <th className="admin-table-header">פעולה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-sm font-bold text-slate-500 text-center" colSpan={3}>
                        אין נתונים
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={`${it.timestamp}_${idx}`} className="admin-table-row">
                        <td className="admin-table-cell text-slate-500 font-mono text-xs">{it.time}</td>
                        <td className="admin-table-cell font-bold text-slate-900">{it.user}</td>
                        <td className="admin-table-cell text-slate-700">{it.action}</td>
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
