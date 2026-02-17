/**
 * Organization Billing Panel
 *
 * Admin component for managing organization billing
 * Uses Morning (Green Invoice) integration
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FileText, CircleAlert, CircleCheck, Clock, CircleX } from 'lucide-react';
import {
  createOrganizationInvoice,
  getOrganizationBillingInfo,
  getOrganizationBillingStatusAction,
} from '@/app/actions/app-billing';

interface OrganizationBillingPanelProps {
  organizationId: string;
  organizationName: string;
}

export const OrganizationBillingPanel: React.FC<OrganizationBillingPanelProps> = ({
  organizationId,
  organizationName,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [billingStatus, setBillingStatus] = useState<any>(null);

  const loadBillingInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const [infoResult, statusResult] = await Promise.all([
        getOrganizationBillingInfo(organizationId),
        getOrganizationBillingStatusAction(organizationId),
      ]);

      if (infoResult.success && infoResult.data) {
        setBillingInfo(infoResult.data);
      }

      if (statusResult.success && statusResult.data) {
        setBillingStatus(statusResult.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await createOrganizationInvoice(organizationId);

      if (result.success && result.data) {
        setSuccess(
          `חשבונית נוצרה בהצלחה! מספר חשבונית: ${result.data.invoiceNumber || 'N/A'}`
        );

        // Reload billing info
        await loadBillingInfo();
      } else {
        setError(result.error || 'שגיאה ביצירת חשבונית');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadBillingInfo();
  }, [organizationId]);

  const getStatusBadge = () => {
    if (!billingInfo) return null;

    const status = billingInfo.subscriptionStatus;
    const badges = {
      trial: {
        label: 'תקופת ניסיון',
        icon: Clock,
        color: 'bg-blue-100 text-blue-700',
      },
      active: {
        label: 'פעיל',
        icon: CircleCheck,
        color: 'bg-green-100 text-green-700',
      },
      past_due: {
        label: 'תשלום באיחור',
        icon: CircleAlert,
        color: 'bg-yellow-100 text-yellow-700',
      },
      cancelled: {
        label: 'מבוטל',
        icon: CircleX,
        color: 'bg-red-100 text-red-700',
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.trial;
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${badge.color}`}>
        <Icon size={16} />
        {badge.label}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="text-green-600" size={28} />
            חיוב - {organizationName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">ניהול חיוב דרך Morning (חשבונית ירוקה)</p>
        </div>
        {billingInfo && getStatusBadge()}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3"
        >
          <CircleAlert className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-800 font-bold text-sm">שגיאה</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-start gap-3"
        >
          <CircleCheck className="text-green-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-green-800 font-bold text-sm">הצלחה!</p>
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        </motion.div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      )}

      {!loading && billingInfo && (
        <div className="space-y-6">
          {/* Billing Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
              <p className="text-sm text-gray-600 font-bold mb-1">MRR (חודשי)</p>
              <p className="text-3xl font-bold text-green-700">₪{billingInfo.mrr.toFixed(2)}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <p className="text-sm text-gray-600 font-bold mb-1">מחזור חיוב</p>
              <p className="text-2xl font-bold text-blue-700">
                {billingInfo.billingCycle === 'monthly'
                  ? 'חודשי'
                  : billingInfo.billingCycle === 'yearly'
                    ? 'שנתי'
                    : 'לא מוגדר'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <p className="text-sm text-gray-600 font-bold mb-1">ימים עד חיוב הבא</p>
              <p className="text-2xl font-bold text-purple-700">
                {billingStatus?.daysUntilNextBilling !== null
                  ? `${billingStatus.daysUntilNextBilling} ימים`
                  : 'לא מוגדר'}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 font-bold text-sm">אימייל לחיוב:</span>
              <span className="text-gray-900 font-mono text-sm">{billingInfo.billingEmail || 'לא מוגדר'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-bold text-sm">תאריך חיוב הבא:</span>
              <span className="text-gray-900 font-mono text-sm">
                {billingInfo.nextBillingDate
                  ? new Date(billingInfo.nextBillingDate).toLocaleDateString('he-IL')
                  : 'לא מוגדר'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-bold text-sm">מזהה ארגון:</span>
              <span className="text-gray-900 font-mono text-xs">{billingInfo.id}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCreateInvoice}
              disabled={loading || !billingInfo.billingEmail || billingInfo.mrr <= 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={20} />
              צור חשבונית
            </button>

            <button
              onClick={loadBillingInfo}
              disabled={loading}
              className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700 font-bold py-3 px-6 rounded-xl transition-colors"
            >
              רענן
            </button>
          </div>

          {/* Warnings */}
          {!billingInfo.billingEmail && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800 text-sm font-bold">
                ⚠️ חסר אימייל לחיוב. לא ניתן ליצור חשבונית ללא אימייל.
              </p>
            </div>
          )}

          {billingInfo.mrr <= 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800 text-sm font-bold">⚠️ MRR הוא 0. עדכן את MRR לפני יצירת חשבונית.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
