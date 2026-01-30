import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Link2, Power, ShieldCheck } from 'lucide-react';
import { disconnectSocialIntegration, getSocialIntegrations } from '@/app/actions/admin-social';
import { Button } from '@/components/ui/button';

type ProviderKey = 'facebook' | 'instagram' | 'whatsapp';

type IntegrationStatus = {
  provider: ProviderKey;
  label: string;
  connected: boolean;
  tokenExpiresAt: string | null;
  connectedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function IntegrationsTab({
  tenantId,
  addToast,
}: {
  tenantId: string | null;
  addToast: (message: string, type?: string) => void;
}) {
  const [rows, setRows] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<ProviderKey | null>(null);

  const load = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await getSocialIntegrations(id);
      if (!res.success) {
        throw new Error(res.error || 'שגיאה בטעינת אינטגרציות');
      }
      setRows((res.data || []) as any);
    } catch (e: any) {
      console.error('[IntegrationsTab] Failed to load integrations:', e);
      addToast(e?.message || 'שגיאה בטעינת אינטגרציות', 'error');
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

  const disconnect = async (provider: ProviderKey) => {
    const row = rows.find((r) => r.provider === provider);
    if (!row?.connected) return;
    if (!tenantId) return;
    const ok = confirm(`לנתק את ${row.label} מהטננט?`);
    if (!ok) return;

    setIsDisconnecting(provider);
    try {
      const res = await disconnectSocialIntegration(tenantId, provider);
      if (!res.success) {
        throw new Error(res.error || 'שגיאה בניתוק אינטגרציה');
      }
      addToast('האינטגרציה נותקה', 'success');
      await load(tenantId);
    } catch (e: any) {
      console.error('[IntegrationsTab] Failed to disconnect integration:', e);
      addToast(e?.message || 'שגיאה בניתוק אינטגרציה', 'error');
    } finally {
      setIsDisconnecting(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-900 mb-1">אינטגרציות</h2>
        <p className="text-sm text-slate-600">
          ניהול חיבורים ברמת מערכת לטננט.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white/80 border border-slate-200 rounded-2xl p-6 text-sm font-bold text-slate-600 mb-4">
          טוען אינטגרציות...
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {rows.map((r) => {
          const isConnected = Boolean(r.connected);
          return (
            <div
              key={r.provider}
              className="bg-white/80 border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} className="text-slate-500" />
                    <h3 className="text-sm font-black text-slate-900 truncate">{r.label}</h3>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <ShieldCheck size={14} /> {isConnected ? 'מחובר' : 'מנותק'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => disconnect(r.provider)}
                  disabled={!isConnected || isLoading || isDisconnecting !== null}
                  type="button"
                  variant="outline"
                  className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-black text-xs border transition-colors ${
                    isConnected
                      ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                      : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <Power size={14} /> {isDisconnecting === r.provider ? 'מנתק...' : 'נתק'}
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">חובר בתאריך</span>
                  <span className="text-slate-900 font-black">{formatDate(r.connectedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">תוקף טוקן</span>
                  <span className="text-slate-900 font-black">{formatDate(r.tokenExpiresAt)}</span>
                </div>
              </div>

              <div className="mt-4">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    addToast('אין מסך פרטי אינטגרציה בשלב זה (Mock)', 'info');
                  }}
                  className="inline-flex items-center gap-2 text-xs font-black text-indigo-700 hover:text-indigo-800"
                >
                  <ExternalLink size={14} /> פרטים
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
