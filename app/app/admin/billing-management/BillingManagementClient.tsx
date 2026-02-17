/**
 * Billing Management Client Component
 *
 * Displays billing events audit trail with filters and search
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  webhook_unknown: { label: 'Webhook: לא ידוע', icon: CircleAlert, color: 'text-gray-600' },
};

const getEventTypeInfo = (eventType: string) => {
  return (
    EVENT_TYPE_LABELS[eventType] || {
      label: eventType,
      icon: FileText,
      color: 'text-gray-600',
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            ניהול גבייה
          </h1>
          <p className="text-gray-600 mt-1">מעקב אחר אירועי חיוב ותשלומים</p>
        </div>
        <Button onClick={loadEvents} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-1">סה״כ אירועים</p>
          <p className="text-2xl font-black text-gray-900">{events.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-1">תשלומים הצליחו</p>
          <p className="text-2xl font-black text-green-700">
            {events.filter((e) => e.eventType === 'payment_successful').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-1">תשלומים נכשלו</p>
          <p className="text-2xl font-black text-red-700">
            {events.filter((e) => e.eventType === 'payment_failed').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-1">Webhooks</p>
          <p className="text-2xl font-black text-blue-700">
            {events.filter((e) => e.eventType.startsWith('webhook_')).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">חיפוש</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="חפש לפי ארגון, סוג אירוע, או ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">סנן לפי סוג</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">כל האירועים ({events.length})</option>
              {uniqueEventTypes.map((type) => (
                <option key={type} value={type}>
                  {getEventTypeInfo(type).label} ({events.filter((e) => e.eventType === type).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-black text-gray-900">
            אירועים אחרונים ({filteredEvents.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <CircleAlert className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">לא נמצאו אירועים</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
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
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon className={`w-5 h-5 ${eventInfo.color}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <p className="font-bold text-gray-900">{eventInfo.label}</p>
                            {event.organizationName && (
                              <p className="text-sm text-gray-600">{event.organizationName}</p>
                            )}
                          </div>
                          {event.amount > 0 && (
                            <div className="text-left shrink-0">
                              <p className="text-lg font-black text-gray-900">
                                ₪{event.amount.toFixed(0)}
                              </p>
                              <p className="text-xs text-gray-500">{event.currency}</p>
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        {event.metadata && typeof event.metadata === 'object' ? (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              פרטים נוספים
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : null}

                        {/* Footer */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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
