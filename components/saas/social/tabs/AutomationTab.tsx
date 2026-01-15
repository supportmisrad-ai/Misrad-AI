import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Sparkles } from 'lucide-react';
import { getSocialAutomation, updateSocialAutomation } from '@/app/actions/admin-social';

type AutomationState = {
  enableAutoReplySystem: boolean;
  allowExternalWebhooks: boolean;
};

export function AutomationTab({
  tenantId,
  addToast,
}: {
  tenantId: string | null;
  addToast: (message: string, type?: string) => void;
}) {
  const [form, setForm] = useState<AutomationState>({
    enableAutoReplySystem: false,
    allowExternalWebhooks: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!tenantId) {
        setForm({ enableAutoReplySystem: false, allowExternalWebhooks: false });
        return;
      }
      setIsLoading(true);
      try {
        const res = await getSocialAutomation(tenantId);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'שגיאה בטעינת אוטומציות');
        }
        setForm({
          enableAutoReplySystem: Boolean(res.data.enableAutoReplySystem),
          allowExternalWebhooks: Boolean(res.data.allowExternalWebhooks),
        });
      } catch (e: any) {
        console.error('[AutomationTab] Failed to load automation:', e);
        addToast(e?.message || 'שגיאה בטעינת אוטומציות', 'error');
        setForm({ enableAutoReplySystem: false, allowExternalWebhooks: false });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [tenantId, addToast]);

  const toggle = (key: keyof AutomationState) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const save = async () => {
    if (!tenantId) {
      addToast('בחר טננט כדי לשמור אוטומציות', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await updateSocialAutomation(tenantId, form);
      if (!res.success) {
        throw new Error(res.error || 'שגיאה בשמירת אוטומציות');
      }
      addToast('אוטומציות נשמרו', 'success');
    } catch (e: any) {
      console.error('[AutomationTab] Failed to save automation:', e);
      addToast(e?.message || 'שגיאה בשמירת אוטומציות', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-900 mb-1">אוטומציות</h2>
        <p className="text-sm text-slate-600">הגדרות גלובליות של אוטומציות עבור הטננט.</p>
      </div>

      <div className="bg-white/80 border border-slate-200 rounded-2xl p-6">
        {isLoading ? (
          <div className="text-sm font-bold text-slate-600 mb-4">טוען אוטומציות...</div>
        ) : null}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 border border-slate-200 rounded-2xl p-4 bg-white">
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900">Enable Auto-Reply System</div>
              <div className="text-xs font-bold text-slate-500">האם מותר להשתמש במנגנון אוטומציות/Auto Reply</div>
            </div>
            <button
              type="button"
              onClick={() => toggle('enableAutoReplySystem')}
              disabled={isLoading || isSaving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors border ${
                form.enableAutoReplySystem ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-200 border-slate-300'
              } disabled:opacity-50`}
              aria-pressed={form.enableAutoReplySystem}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  form.enableAutoReplySystem ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 border border-slate-200 rounded-2xl p-4 bg-white">
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900">Allow External Webhooks</div>
              <div className="text-xs font-bold text-slate-500">האם מותר להגדיר Webhooks חיצוניים</div>
            </div>
            <button
              type="button"
              onClick={() => toggle('allowExternalWebhooks')}
              disabled={isLoading || isSaving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors border ${
                form.allowExternalWebhooks ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-200 border-slate-300'
              } disabled:opacity-50`}
              aria-pressed={form.allowExternalWebhooks}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  form.allowExternalWebhooks ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Sparkles size={14} />
            <span>נשמר תחת system_settings.system_flags.socialAutomation</span>
          </div>

          <button
            onClick={save}
            disabled={isLoading || isSaving}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            type="button"
          >
            <Save size={16} /> {isSaving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
