'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, FileText } from 'lucide-react';
import { updatePaymentOrderStatus, updateInvoiceStatus } from '@/app/actions/admin-payments';
import { adminMarkSubscriptionOrderPaid } from '@/app/actions/subscription-orders-admin';
import { getSubscriptionPaymentConfigs, upsertSubscriptionPaymentConfig } from '@/app/actions/subscription-payment-configs';
import { Button } from '@/components/ui/button';
import { getPackageLabelHe } from '@/lib/billing/plan-labels';
import type { PackageType } from '@/lib/server/workspace';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

type PaymentMethod = 'manual' | 'automatic';

const PACKAGE_KEYS = ['solo', 'the_closer', 'the_authority', 'the_operator', 'the_empire', 'the_mentor'] as const satisfies readonly PackageType[];
type PackageKey = (typeof PACKAGE_KEYS)[number];

function isPackageKey(value: unknown): value is PackageKey {
  return typeof value === 'string' && (PACKAGE_KEYS as readonly string[]).includes(value);
}

type SubscriptionOrderStatus = 'paid' | 'pending' | 'cancelled' | 'pending_verification';

type SubscriptionOrder = {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  package_type: string | null;
  amount: number;
  status: SubscriptionOrderStatus | string;
  created_at: string;
  proof_image_url: string | null;
};

type ClientLite = { company_name: string | null };

type PaymentOrderStatus = 'pending' | 'paid' | 'cancelled';
type PaymentOrder = {
  id: string;
  amount: number;
  description: string | null;
  status: PaymentOrderStatus;
  created_at: string;
  clients: ClientLite | null;
};

type InvoiceStatus = 'pending' | 'paid' | 'overdue';
type Invoice = {
  id: string;
  invoice_number: string | null;
  amount: number;
  status: InvoiceStatus;
  date: string | null;
  created_at: string;
  clients: ClientLite | null;
};

type PaymentsData = {
  subscriptionOrders: SubscriptionOrder[];
  paymentOrders: PaymentOrder[];
  invoices: Invoice[];
};

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toPaymentOrderStatus(value: unknown): PaymentOrderStatus {
  return value === 'paid' || value === 'pending' || value === 'cancelled' ? value : 'pending';
}

function toInvoiceStatus(value: unknown): InvoiceStatus {
  return value === 'paid' || value === 'pending' || value === 'overdue' ? value : 'pending';
}

function coerceClientLite(value: unknown): ClientLite | null {
  const obj = asObject(value);
  if (!obj) return null;
  const companyName = obj.company_name;
  return { company_name: companyName == null ? null : String(companyName) };
}

function coerceSubscriptionOrder(value: unknown): SubscriptionOrder {
  const obj = asObject(value) ?? {};
  return {
    id: String(obj.id ?? ''),
    customer_email: obj.customer_email == null ? null : String(obj.customer_email),
    customer_name: obj.customer_name == null ? null : String(obj.customer_name),
    customer_phone: obj.customer_phone == null ? null : String(obj.customer_phone),
    package_type: obj.package_type == null ? null : String(obj.package_type),
    amount: toNumber(obj.amount),
    status: String(obj.status ?? 'pending'),
    created_at: String(obj.created_at ?? ''),
    proof_image_url: obj.proof_image_url == null ? null : String(obj.proof_image_url),
  };
}

function coercePaymentOrder(value: unknown): PaymentOrder {
  const obj = asObject(value) ?? {};
  return {
    id: String(obj.id ?? ''),
    amount: toNumber(obj.amount),
    description: obj.description == null ? null : String(obj.description),
    status: toPaymentOrderStatus(obj.status),
    created_at: String(obj.created_at ?? ''),
    clients: coerceClientLite(obj.clients),
  };
}

function coerceInvoice(value: unknown): Invoice {
  const obj = asObject(value) ?? {};
  return {
    id: String(obj.id ?? ''),
    invoice_number: obj.invoice_number == null ? null : String(obj.invoice_number),
    amount: toNumber(obj.amount),
    status: toInvoiceStatus(obj.status),
    date: obj.date == null ? null : String(obj.date),
    created_at: String(obj.created_at ?? ''),
    clients: coerceClientLite(obj.clients),
  };
}

function coercePaymentsData(value: unknown): PaymentsData {
  const root = asObject(value);
  const payload = asObject(root?.data ?? value) ?? {};
  const subscriptionOrdersRaw = payload.subscriptionOrders;
  const paymentOrdersRaw = payload.paymentOrders;
  const invoicesRaw = payload.invoices;

  return {
    subscriptionOrders: Array.isArray(subscriptionOrdersRaw) ? subscriptionOrdersRaw.map(coerceSubscriptionOrder) : [],
    paymentOrders: Array.isArray(paymentOrdersRaw) ? paymentOrdersRaw.map(coercePaymentOrder) : [],
    invoices: Array.isArray(invoicesRaw) ? invoicesRaw.map(coerceInvoice) : [],
  };
}

interface PaymentsTabProps {
  payments: unknown;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PaymentsTab({ payments, onRefresh, addToast }: PaymentsTabProps) {
  const paymentsData = useMemo(() => coercePaymentsData(payments), [payments]);
  const subscriptionOrders = paymentsData.subscriptionOrders;

  const packageKeys = useMemo(() => PACKAGE_KEYS, []);

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configs, setConfigs] = useState<
    Record<
      PackageKey,
      {
        title: string;
        qrImageUrl: string;
        instructionsText: string;
        paymentMethod: PaymentMethod;
        externalPaymentUrl: string;
      }
    >
  >({
    solo: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_closer: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_authority: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_operator: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_empire: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_mentor: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
  });

  const pendingVerificationCount = useMemo(() => {
    return (subscriptionOrders || []).filter((o) => o.status === 'pending_verification').length;
  }, [subscriptionOrders]);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const res = await getSubscriptionPaymentConfigs();
        if (!res.success || !res.data) return;
        setConfigs((prev) => {
          const next = { ...prev };
          for (const row of res.data || []) {
            const key: PackageType = row.package_type;
            if (!isPackageKey(key)) continue;
            next[key] = {
              title: row.title || '',
              qrImageUrl: row.qr_image_url || '',
              instructionsText: row.instructions_text || '',
              paymentMethod: row.payment_method === 'automatic' ? 'automatic' : 'manual',
              externalPaymentUrl: row.external_payment_url || '',
            };
          }
          return next;
        });
      } catch {
        // ignore
      }
    };
    loadConfigs();
  }, []);

  return (
    <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">תשלומים</h3>
            <p className="text-sm text-slate-600">כל התשלומים, חשבוניות וחובות</p>
          </div>
        </div>
        <div className="p-10">
          <div className="flex flex-col gap-8">
            {/* Subscription Orders (Manual Bit) */}
            <div>
              <h4 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-emerald-600" />
                הזמנות מנוי (ביט)
                {pendingVerificationCount > 0 && (
                  <span className="mr-2 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                    {pendingVerificationCount} ממתין לאימות
                  </span>
                )}
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/50 border-b border-emerald-100">
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">מייל</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">שם</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">חבילה</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">סכום</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">סטטוס</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">תאריך</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subscriptionOrders || []).map((order) => {
                      const isPendingVerification = order.status === 'pending_verification';
                      return (
                        <tr
                          key={order.id}
                          className={`border-b border-emerald-50 hover:bg-emerald-50/50 transition-colors ${
                            isPendingVerification ? 'bg-rose-50/60' : ''
                          }`}
                        >
                          <td className="p-4">
                            <p className="font-black text-slate-900">{order.customer_email || '-'}</p>
                            {order.proof_image_url && (
                              <a
                                href={order.proof_image_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-600 font-bold"
                              >
                                צפייה בהוכחה
                              </a>
                            )}
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-slate-700">{order.customer_name || '-'}</p>
                            <p className="text-xs text-slate-500">{order.customer_phone || '-'}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-slate-700 font-bold">{order.package_type || '-'}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-black text-slate-900">₪{Number(order.amount || 0).toLocaleString()}</p>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                                order.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : order.status === 'pending_verification'
                                    ? 'bg-rose-100 text-rose-700'
                                    : order.status === 'pending'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {order.status === 'paid'
                                ? 'שולם'
                                : order.status === 'pending_verification'
                                  ? 'ממתין לאימות'
                                  : order.status === 'pending'
                                    ? 'ממתין'
                                    : 'בוטל'}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleDateString('he-IL')}</p>
                          </td>
                          <td className="p-4">
                            <Button
                              disabled={order.status === 'paid'}
                              onClick={async () => {
                                const result = await adminMarkSubscriptionOrderPaid({ orderId: order.id });
                                if (result.success) {
                                  addToast('הזמנה אושרה ונפתחה גישה', 'success');
                                  onRefresh();
                                } else {
                                  addToast(result.error || 'שגיאה באישור תשלום', 'error');
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm"
                            >
                              סמן כשולם
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {(!subscriptionOrders || subscriptionOrders.length === 0) && (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-emerald-300 mx-auto mb-2" />
                    <p className="text-slate-600 font-bold">אין הזמנות מנוי</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Payment Configs */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h4 className="text-xl font-black text-slate-900 mb-4">הגדרות QR לתשלום לפי חבילה</h4>
              <div className="grid grid-cols-1 gap-4">
                {packageKeys.map((pkg) => (
                  <div key={pkg} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white rounded-xl border border-slate-200 p-4">
                    <div className="md:col-span-1">
                      <div className="text-xs font-black text-slate-600 mb-2">{getPackageLabelHe(pkg)}</div>
                      <div className="text-[10px] text-slate-500 mb-2">{pkg}</div>
                      <input
                        value={configs[pkg]?.title ?? ''}
                        onChange={(e) => setConfigs((prev) => ({ ...prev, [pkg]: { ...prev[pkg], title: e.target.value } }))}
                        placeholder="כותרת"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <div className="text-xs font-black text-slate-600 mb-2">QR Image URL</div>
                      <input
                        value={configs[pkg]?.qrImageUrl ?? ''}
                        onChange={(e) => setConfigs((prev) => ({ ...prev, [pkg]: { ...prev[pkg], qrImageUrl: e.target.value } }))}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <div className="text-xs font-black text-slate-600 mb-2">טקסט הנחיות</div>
                      <input
                        value={configs[pkg]?.instructionsText ?? ''}
                        onChange={(e) => setConfigs((prev) => ({ ...prev, [pkg]: { ...prev[pkg], instructionsText: e.target.value } }))}
                        placeholder="הוראות קצרות..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <div className="text-xs font-black text-slate-600 mb-2">Payment Method</div>
                      <select
                        value={configs[pkg]?.paymentMethod ?? 'manual'}
                        onChange={(e) =>
                          setConfigs((prev) => ({
                            ...prev,
                            [pkg]: { ...prev[pkg], paymentMethod: e.target.value === 'automatic' ? 'automatic' : 'manual' },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                      >
                        <option value="manual">manual (QR + הוכחה)</option>
                        <option value="automatic">automatic (ישראכרט/Grow)</option>
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <div className="text-xs font-black text-slate-600 mb-2">External Payment URL</div>
                      <input
                        value={configs[pkg]?.externalPaymentUrl ?? ''}
                        onChange={(e) => setConfigs((prev) => ({ ...prev, [pkg]: { ...prev[pkg], externalPaymentUrl: e.target.value } }))}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button
                    disabled={isSavingConfig}
                    onClick={async () => {
                      setIsSavingConfig(true);
                      try {
                        for (const pkg of packageKeys) {
                          const cfg = configs[pkg];
                          const result = await upsertSubscriptionPaymentConfig({
                            packageType: pkg,
                            title: cfg?.title || '',
                            qrImageUrl: cfg?.qrImageUrl || '',
                            instructionsText: cfg?.instructionsText || '',
                            paymentMethod: cfg?.paymentMethod || 'manual',
                            externalPaymentUrl: cfg?.externalPaymentUrl || '',
                          });
                          if (!result.success) {
                            throw new Error(result.error || 'שגיאה בשמירה');
                          }
                        }
                        addToast('הגדרות תשלום נשמרו', 'success');
                      } catch (e: unknown) {
                        addToast(getErrorMessage(e) || 'שגיאה בשמירה', 'error');
                      } finally {
                        setIsSavingConfig(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm"
                  >
                    {isSavingConfig ? 'שומר...' : 'שמור הגדרות'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Payment Orders */}
            <div>
              <h4 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-indigo-500" />
                הזמנות תשלום
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-indigo-50/50 border-b border-indigo-100">
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">לקוח</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">סכום</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">תיאור</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">סטטוס</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">תאריך</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsData.paymentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-indigo-50 hover:bg-indigo-50/50 transition-colors">
                        <td className="p-4">
                          <p className="font-black text-slate-900">{order.clients?.company_name || 'לא ידוע'}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-black text-slate-900">₪{Number(order.amount).toLocaleString()}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-600">{order.description || '-'}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                            order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {order.status === 'paid' ? 'שולם' : order.status === 'pending' ? 'ממתין' : 'בוטל'}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleDateString('he-IL')}</p>
                        </td>
                        <td className="p-4">
                          <select
                            value={order.status}
                            onChange={async (e) => {
                              const next = e.target.value;
                              if (next !== 'pending' && next !== 'paid' && next !== 'cancelled') return;
                              const result = await updatePaymentOrderStatus(order.id, next);
                              if (result.success) {
                                addToast('סטטוס עודכן', 'success');
                                onRefresh();
                              }
                            }}
                            className="bg-white border border-indigo-200 rounded-lg px-3 py-1 text-sm outline-none focus:border-indigo-400"
                          >
                            <option value="pending">ממתין</option>
                            <option value="paid">שולם</option>
                            <option value="cancelled">בוטל</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paymentsData.paymentOrders.length === 0 && (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-indigo-300 mx-auto mb-2" />
                    <p className="text-slate-600 font-bold">אין הזמנות תשלום</p>
                  </div>
                )}
              </div>
            </div>

            {/* Invoices */}
            <div>
              <h4 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-purple-500" />
                חשבוניות
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-purple-50/50 border-b border-purple-100">
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">לקוח</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">מספר חשבונית</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">סכום</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">סטטוס</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">תאריך</th>
                      <th className="p-4 text-[10px] font-black text-slate-600 uppercase">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsData.invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-purple-50 hover:bg-purple-50/50 transition-colors">
                        <td className="p-4">
                          <p className="font-black text-slate-900">{invoice.clients?.company_name || 'לא ידוע'}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-black text-slate-900">{invoice.invoice_number || '-'}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-black text-slate-900">₪{Number(invoice.amount).toLocaleString()}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                            invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            invoice.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {invoice.status === 'paid' ? 'שולם' : invoice.status === 'overdue' ? 'בפיגור' : 'ממתין'}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-600">{new Date(invoice.date || invoice.created_at).toLocaleDateString('he-IL')}</p>
                        </td>
                        <td className="p-4">
                          <select
                            value={invoice.status}
                            onChange={async (e) => {
                              const next = e.target.value;
                              if (next !== 'pending' && next !== 'paid' && next !== 'overdue') return;
                              const result = await updateInvoiceStatus(invoice.id, next);
                              if (result.success) {
                                addToast('סטטוס עודכן', 'success');
                                onRefresh();
                              }
                            }}
                            className="bg-white border border-purple-200 rounded-lg px-3 py-1 text-sm outline-none focus:border-purple-400"
                          >
                            <option value="pending">ממתין</option>
                            <option value="paid">שולם</option>
                            <option value="overdue">בפיגור</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paymentsData.invoices.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-purple-300 mx-auto mb-2" />
                    <p className="text-slate-600 font-bold">אין חשבוניות</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

