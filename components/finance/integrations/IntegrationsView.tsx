'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plug, CircleCheckBig, CircleX, ExternalLink } from 'lucide-react';
import { GreenInvoiceConnectModal } from '../../GreenInvoiceConnectModal';
import { useToast } from '../../system/contexts/ToastContext';

type GreenInvoiceStatus = {
  isLoading: boolean;
  connected: boolean;
  lastSynced: string | null;
  error: string | null;
};

const IntegrationsView: React.FC = () => {
  const { addToast } = useToast();
  const [isGreenInvoiceModalOpen, setIsGreenInvoiceModalOpen] = useState(false);

  const otherIntegrations = [
    {
      id: 'icount',
      name: 'iCount',
      description: 'חשבוניות מס, דוחות, ניהול מלאי',
    },
    {
      id: 'online-invoices',
      name: 'חשבוניות אונליין',
      description: 'חשבוניות, קבלות, הצעות מחיר',
    },
    {
      id: 'smit',
      name: 'סמיט (Smit)',
      description: 'חשבוניות, תעודות משלוח, לקוחות',
    },
    {
      id: 'ezcount',
      name: 'EZcount',
      description: 'חשבוניות מס, זיכויים, הצעות מחיר',
    },
    {
      id: 'rivhit',
      name: 'רווחית (Rivhit)',
      description: 'הנהלת חשבונות מלאה ומע"מ',
    },
    {
      id: 'grow',
      name: 'Grow',
      description: 'ניהול הכנסות ותשלומים',
    },
    {
      id: 'payme',
      name: 'PayMe',
      description: 'סליקה וקישורי תשלום',
    },
    {
      id: 'meshulam',
      name: 'משולם (Meshulam)',
      description: 'סליקה וקבלות דיגיטליות',
    },
    {
      id: 'cardcom',
      name: 'CardCom',
      description: 'סליקה + חשבוניות אוטומטיות',
    },
    {
      id: 'tranzila',
      name: 'Tranzila',
      description: 'סליקה בינלאומית',
    },
    {
      id: 'hyp',
      name: 'Hyp (ClearPay)',
      description: 'קישורי תשלום וחשבוניות',
    },
    {
      id: 'priority',
      name: 'פריורטי (Priority)',
      description: 'ERP לעסקים בינוניים',
    },
    {
      id: 'hashavshevet',
      name: 'חשבשבת',
      description: 'הנהלת חשבונות למשרדי רו"ח',
    },
  ];

  const [greenInvoiceStatus, setGreenInvoiceStatus] = useState<GreenInvoiceStatus>({
    isLoading: true,
    connected: false,
    lastSynced: null,
    error: null,
  });

  const loadGreenInvoiceStatus = useCallback(async () => {
    setGreenInvoiceStatus((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/integrations/green-invoice/status', {
        method: 'GET',
        cache: 'no-store',
      });

      const data: unknown = await response.json().catch(() => ({}));
      const dataObj = data as Record<string, unknown>;
      const connected = Boolean(dataObj?.connected);
      const lastSynced = typeof dataObj?.lastSynced === 'string' ? dataObj.lastSynced : null;

      setGreenInvoiceStatus({
        isLoading: false,
        connected,
        lastSynced,
        error: null,
      });
    } catch (error: unknown) {
      setGreenInvoiceStatus({
        isLoading: false,
        connected: false,
        lastSynced: null,
        error: String(error instanceof Error ? error.message : error || 'שגיאה בבדיקת סטטוס חיבור'),
      });
    }
  }, []);

  useEffect(() => {
    loadGreenInvoiceStatus();
  }, [loadGreenInvoiceStatus]);

  const handleGreenInvoiceSuccess = () => {
    addToast('פרטי החיבור נשמרו. מעדכן סטטוס...', 'success');
    loadGreenInvoiceStatus();
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">אינטגרציות</h2>
          <p className="text-slate-500">חברו את המערכת שלכם למערכות כספיות חיצוניות</p>
        </div>

        {/* Morning (Green Invoice) Integration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Plug className="text-emerald-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Morning (חשבונית ירוקה)</h3>
                <p className="text-sm text-slate-500">חשבוניות מס/קבלה וסנכרון דו-כיווני</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {greenInvoiceStatus.isLoading ? (
                <div className="text-sm font-medium text-slate-500">בודק סטטוס...</div>
              ) : greenInvoiceStatus.connected ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CircleCheckBig size={20} />
                  <span className="text-sm font-medium">מחובר</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsGreenInvoiceModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                >
                  חיבור
                </button>
              )}
            </div>
          </div>
        </div>

        {otherIntegrations.map((integration) => (
          <div key={integration.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Plug className="text-slate-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{integration.name}</h3>
                  <p className="text-xs text-slate-500">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <CircleX size={18} />
                  <span className="text-xs font-bold">לא זמין</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <ExternalLink className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-blue-900 mb-1">איך זה עובד?</h4>
              <p className="text-sm text-blue-700">
                אינטגרציות שמסומנות כ"מחובר" יאפשרו יצירה וסנכרון חשבוניות.
                ספקים שמסומנים כ"לא זמין" אינם מחוברים כרגע.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Green Invoice Connect Modal */}
      <GreenInvoiceConnectModal
        isOpen={isGreenInvoiceModalOpen}
        onClose={() => setIsGreenInvoiceModalOpen(false)}
        onSuccess={handleGreenInvoiceSuccess}
      />
    </div>
  );
};

export default IntegrationsView;

