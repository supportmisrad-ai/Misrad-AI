import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Trash2, User } from 'lucide-react';
import { getTeam, removeUserFromTeam, updateUserRole } from '@/app/actions/admin-social';
import { Button } from '@/components/ui/button';
import { Toast } from '@/types';

type Role = 'super_admin' | 'owner' | 'team_member';

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function roleLabel(role: Role) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'owner':
      return 'Owner';
    case 'team_member':
      return 'Member';
  }
}

export function TeamTab({
  tenantId,
  addToast,
}: {
  tenantId: string | null;
  addToast: (message: string, type?: Toast['type']) => void;
}) {
  const [rows, setRows] = useState<TeamUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const load = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await getTeam(id);
      if (!res.success) {
        throw new Error(res.error || 'שגיאה בטעינת צוות');
      }
      setRows((res.data || []) as any);
    } catch (e: any) {
      console.error('[TeamTab] Failed to load team:', e);
      addToast(e?.message || 'שגיאה בטעינת צוות', 'error');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId) {
      setRows([]);
      return;
    }
    load(tenantId);
  }, [tenantId, addToast]);

  const onChangeRole = async (userId: string, role: Role) => {
    if (!tenantId) return;
    setIsUpdatingRole(userId);
    try {
      const res = await updateUserRole(tenantId, userId, role);
      if (!res.success) {
        throw new Error(res.error || 'שגיאה בעדכון תפקיד');
      }
      addToast('התפקיד עודכן', 'success');
      await load(tenantId);
    } catch (e: any) {
      console.error('[TeamTab] Failed to update role:', e);
      addToast(e?.message || 'שגיאה בעדכון תפקיד', 'error');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const onRemove = async (userId: string, name: string) => {
    if (!tenantId) return;
    const ok = confirm(`להסיר את ${name || 'המשתמש'} מהצוות?`);
    if (!ok) return;

    setIsRemoving(userId);
    try {
      const res = await removeUserFromTeam(tenantId, userId);
      if (!res.success) {
        throw new Error(res.error || 'שגיאה בהסרת משתמש');
      }
      addToast('המשתמש הוסר', 'success');
      await load(tenantId);
    } catch (e: any) {
      console.error('[TeamTab] Failed to remove user:', e);
      addToast(e?.message || 'שגיאה בהסרת משתמש', 'error');
    } finally {
      setIsRemoving(null);
    }
  };

  const sortedRows = useMemo(() => {
    const order: Record<Role, number> = { super_admin: 0, owner: 1, team_member: 2 };
    return [...rows].sort((a, b) => {
      const aO = order[a.role] ?? 9;
      const bO = order[b.role] ?? 9;
      if (aO !== bO) return aO - bO;
      return String(a.name || '').localeCompare(String(b.name || ''), 'he');
    });
  }, [rows]);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-900 mb-1">צוות</h2>
        <p className="text-sm text-slate-600">
          צפייה בתפקידי משתמש ברמת טננט.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white/80 border border-slate-200 rounded-2xl p-6 text-sm font-bold text-slate-600">
          טוען צוות...
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="bg-white/80 border border-slate-200 rounded-2xl p-6 text-sm font-bold text-slate-600">
          לא נמצאו משתמשים עבור הטננט.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-600">משתמש</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-600">אימייל</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-600">תפקיד</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((u) => (
                <tr key={u.id} className="border-t border-slate-200">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                        <User size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 truncate">{u.name}</div>
                        <div className="text-xs font-bold text-slate-500 truncate">{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-slate-700">{u.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black">
                        <Shield size={14} />
                      </span>
                      <select
                        value={u.role}
                        onChange={(e) => onChangeRole(u.id, e.target.value as Role)}
                        disabled={isLoading || isRemoving !== null || isUpdatingRole === u.id}
                        className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-black text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/60 transition-all"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="owner">Owner</option>
                        <option value="team_member">Member</option>
                      </select>
                      <span className="text-xs font-bold text-slate-500">{roleLabel(u.role)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      onClick={() => onRemove(u.id, u.name)}
                      disabled={isLoading || isUpdatingRole !== null || isRemoving === u.id}
                      type="button"
                      variant="outline"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-black text-xs border bg-white text-red-600 border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} /> {isRemoving === u.id ? 'מסיר...' : 'הסר'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
