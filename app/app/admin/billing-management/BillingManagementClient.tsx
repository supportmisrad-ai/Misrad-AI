/**
 * Billing Management Client Component
 *
 * Displays billing events audit trail with filters and search
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Search,
  RefreshCw,
  Filter,
  Calendar,
  CircleCheck,
  CircleX,
  CircleAlert,
  CreditCard,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { getBillingEvents } from '@/app/actions/app-billing';

type BillingEvent = {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  eventType: string;
  amount: number;
  currency: string;
  metadata: unknown;
  createdAt: Date;
};

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  payment_successful: { label: 'תשלום הצליח', icon: CircleCheck, color: 'text-green-600' },
  payment_failed: { label: 'תשלום נכשל', icon: CircleX, color: 'text-red-600' },
  webhook_document_paid: { label: 'Webhook: תשלום', icon: CreditCard, color: 'text-green-600' },
  webhook_payment_failed: { label: 'Webhook: כשל', icon: CircleAlert, color: 'text-red-600' },
  webhook_signature_failed: { label: 'Webhook: חתימה שגויה', icon: CircleAlert, color: 'text-orange-600' },
  webhook_unknown: { label: 'Webhook: לא ידוע', icon: CircleAlert, color: 'text-slate-600' },
};

const getEventTypeInfo = (eventType: string) => {
  return (
    EVENT_TYPE_LABELS[eventType] || {
      label: eventType,
      icon: FileText,
      color: 'text-slate-600',
    }
  );
};

export default function BillingManagementClient() {
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const result = await getBillingEvents(200);
      if (result.success && result.data) {
        setEvents(result.data);
        setFilteredEvents(result.data);
      }
    } catch (error) {
      console.error('Error loading billing events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    let filtered = events;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.organizationName?.toLowerCase().includes(query) ||
          event.eventType.toLowerCase().includes(query) ||
          event.id.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((event) => event.eventType === filterType);
    }

    setFilteredEvents(filtered);
  }, [searchQuery, filterType, events]);

  const uniqueEventTypes = Array.from(new Set(events.map((e) => e.eventType)));

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader title="ניהול גבייה" subtitle="מעקב אחר אירועי חיוב ותשלומים" icon={DollarSign} />

      <AdminToolbar
        actions={
          <Button onClick={loadEvents} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500">סה״כ אירועים</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{events.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500">תשלומים הצליחו</div>
          <div className="text-2xl font-black text-green-700 mt-1">
            {events.filter((e) => e.eventType === 'payment_successful').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500">תשלומים נכשלו</div>
          <div className="text-2xl font-black text-red-700 mt-1">
            {events.filter((e) => e.eventType === 'payment_failed').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500">Webhooks</div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {events.filter((e) => e.eventType.startsWith('webhook_')).length}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-2">חיפוש</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="חפש לפי ארגון, סוג אירוע, או ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-2">סנן לפי סוג</label>
            <CustomSelect
              value={filterType}
              onChange={(val) => setFilterType(val)}
              options={[
                { value: 'all', label: `כל האירועים (${events.length})` },
                ...uniqueEventTypes.map((type) => ({
                  value: type,
                  label: `${getEventTypeInfo(type).label} (${events.filter((e) => e.eventType === type).length})`,
                })),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="text-sm font-black text-slate-900">
            אירועים אחרונים ({filteredEvents.length})
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <CircleAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">לא נמצאו אירועים</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {filteredEvents.map((event) => {
                const eventInfo = getEventTypeInfo(event.eventType);
                const Icon = eventInfo.icon;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Icon className={`w-5 h-5 ${eventInfo.color}`} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <p className="font-bold text-slate-900">{eventInfo.label}</p>
                            {event.organizationName && (
                              <p className="text-sm text-slate-600">{event.organizationName}</p>
                            )}
                          </div>
                          {event.amount > 0 && (
                            <div className="text-left shrink-0">
                              <p className="text-lg font-black text-slate-900">
                                ₪{event.amount.toFixed(0)}
                              </p>
                              <p className="text-xs text-slate-500">{event.currency}</p>
                            </div>
                          )}
                        </div>

                        {event.metadata && typeof event.metadata === 'object' ? (
                          <details className="mt-2">
                            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                              פרטים נוספים
                            </summary>
                            <pre className="mt-2 p-2 bg-slate-50 rounded-xl text-xs overflow-x-auto border border-slate-200">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : null}

                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(event.createdAt).toLocaleString('he-IL')}
                          </span>
                          <span className="font-mono">{event.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
