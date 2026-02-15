import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, SlidersHorizontal } from 'lucide-react';
import { getSocialQuotas, updateSocialQuotas } from '@/app/actions/admin-social';
import { Button } from '@/components/ui/button';
import { Toast } from '@/types';

type SocialQuotas = {
  maxPostsPerMonth: number;
  maxConnectedAccounts: number;
  maxTeamMembers: number;
};

export function QuotasTab({
  tenantId,
  addToast,
}: {
  tenantId: string | null;
  addToast: (message: string, type?: Toast['type']) => void;
}) {
  const initial = useMemo<SocialQuotas>(() => ({ maxPostsPerMonth: 0, maxConnectedAccounts: 0, maxTeamMembers: 0 }), []);
  const [form, setForm] = useState<SocialQuotas>(initial);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!tenantId) {
        setForm(initial);
        return;
      }
      setIsLoading(true);
      try {
        const res = await getSocialQuotas(tenantId);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'שגיאה בטעינת מכסות');
        }
        setForm({
          maxPostsPerMonth: Number(res.data.maxPostsPerMonth || 0),
          maxConnectedAccounts: Number(res.data.maxConnectedAccounts || 0),
          maxTeamMembers: Number(res.data.maxTeamMembers || 0),
        });
      } catch (e: unknown) {
        console.error('[QuotasTab] Failed to load quotas:', e);
        addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בטעינת מכסות', 'error');
        setForm(initial);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [tenantId, addToast, initial]);

  const onNumber = (key: keyof SocialQuotas, value: string) => {
    const n = Number(value);
    setForm((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  };

  const save = async () => {
    if (!tenantId) {
      addToast('בחר טננט כדי לשמור מכסות', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateSocialQuotas(tenantId, form);
      if (!res.success) {
        throw new Error(res.error || 'שגיאה בשמירת מכסות');
      }
      addToast('מכסות נשמרו', 'success');
    } catch (e: unknown) {
      console.error('[QuotasTab] Failed to save quotas:', e);
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בשמירת מכסות', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-900 mb-1">מכסות / חבילות</h2>
        <p className="text-sm text-slate-600">שליטה בהגבלות הטננט עבור מודול Social.</p>
      </div>

      <div className="bg-white/80 border border-slate-200 rounded-2xl p-6">
        {isLoading ? (
          <div className="text-sm font-bold text-slate-600">טוען מכסות...</div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">מקסימום פוסטים בחודש</label>
            <input
              type="number"
              value={form.maxPostsPerMonth}
              onChange={(e) => onNumber('maxPostsPerMonth', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-black text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/60 transition-all"
              min={0}
              disabled={isLoading || isSaving}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">מקסימום חשבונות מחוברים</label>
            <input
              type="number"
              value={form.maxConnectedAccounts}
              onChange={(e) => onNumber('maxConnectedAccounts', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-black text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/60 transition-all"
              min={0}
              disabled={isLoading || isSaving}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">מקסימום אנשי צוות</label>
            <input
              type="number"
              value={form.maxTeamMembers}
              onChange={(e) => onNumber('maxTeamMembers', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-black text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/60 transition-all"
              min={0}
              disabled={isLoading || isSaving}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <SlidersHorizontal size={14} />
            <span>נשמר תחת system_settings.system_flags.socialQuotas</span>
          </div>

          <Button
            onClick={save}
            disabled={isLoading || isSaving}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            type="button"
          >
            <Save size={16} /> {isSaving ? 'שומר...' : 'שמור מכסות'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
