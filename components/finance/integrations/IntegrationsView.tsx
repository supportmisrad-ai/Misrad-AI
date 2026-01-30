'use client';

import React, { useState } from 'react';
import { Plug, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { GreenInvoiceConnectModal } from '../../GreenInvoiceConnectModal';
import { useToast } from '../../system/contexts/ToastContext';

const IntegrationsView: React.FC = () => {
  const { addToast } = useToast();
  const [isGreenInvoiceModalOpen, setIsGreenInvoiceModalOpen] = useState(false);
  const [greenInvoiceConnected, setGreenInvoiceConnected] = useState(false);

  const handleGreenInvoiceSuccess = () => {
    setGreenInvoiceConnected(true);
    addToast('חובר בהצלחה לחשבונית ירוקה!', 'success');
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">אינטגרציות</h2>
          <p className="text-slate-500">חברו את המערכת שלכם למערכות כספיות חיצוניות</p>
        </div>

        {/* Green Invoice Integration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Plug className="text-emerald-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">חשבונית ירוקה</h3>
                <p className="text-sm text-slate-500">ניהול חשבוניות דרך חשבונית ירוקה</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {greenInvoiceConnected ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={20} />
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

        {/* Morning Integration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Plug className="text-slate-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">מורנינג</h3>
                <p className="text-sm text-slate-500">ניהול כספים דרך מורנינג</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <XCircle size={20} />
                <span className="text-sm font-medium">לא זמין</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <ExternalLink className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-blue-900 mb-1">איך זה עובד?</h4>
              <p className="text-sm text-blue-700">
                לאחר החיבור, תוכלו ליצור ולנהל חשבוניות ישירות מהמערכת. 
                כל החשבוניות יסונכרנו אוטומטית עם המערכת החיצונית.
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

