'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, User, Play, Loader2, RefreshCw, Calendar, Search } from 'lucide-react';
import { useTelephonyOptional } from '@/contexts/TelephonyContext';

interface CallLogEntry {
  id: string;
  callerNumber: string;
  targetNumber: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration: number;
  date: string;
  recordingUrl?: string;
  leadName?: string;
  leadId?: string;
}

interface CallLogTabProps {
  orgSlug: string;
}

export default function CallLogTab({ orgSlug }: CallLogTabProps) {
  const telephony = useTelephonyOptional();
  const [calls, setCalls] = useState<CallLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');

  const fetchCallLog = useCallback(async () => {
    if (!telephony?.config?.isActive) return;

    setIsLoading(true);
    setError(null);

    try {
      // Calculate date range
      const now = new Date();
      let fromDate: Date;
      
      switch (dateRange) {
        case 'today':
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const res = await fetch('/api/telephony/call-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': encodeURIComponent(orgSlug),
        },
        body: JSON.stringify({
          fromDate: fromDate.toISOString(),
          toDate: now.toISOString(),
          saveToDb: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'שגיאה בטעינת היסטוריית שיחות');
      }

      const data = await res.json();
      
      // Map API response to our format
      const mappedCalls: CallLogEntry[] = (data.calls || []).map((call: Record<string, unknown>) => ({
        id: String(call.CallID || call.id || Math.random()),
        callerNumber: String(call.CallerNumber || call.callerNumber || ''),
        targetNumber: String(call.TargetNumber || call.targetNumber || ''),
        direction: call.CdrType === 1 || call.direction === 'inbound' ? 'inbound' : 'outbound',
        status: String(call.DialStatus || call.status || 'unknown'),
        duration: Number(call.Duration || call.duration || 0),
        date: String(call.Date || call.date || new Date().toISOString()),
        recordingUrl: call.RecordURL ? String(call.RecordURL) : undefined,
        leadName: call.leadName ? String(call.leadName) : undefined,
        leadId: call.leadId ? String(call.leadId) : undefined,
      }));

      setCalls(mappedCalls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, [telephony?.config?.isActive, orgSlug, dateRange]);

  useEffect(() => {
    void fetchCallLog();
  }, [fetchCallLog]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('972')) {
      return `0${phone.slice(3)}`;
    }
    if (phone.startsWith('+972')) {
      return `0${phone.slice(4)}`;
    }
    return phone;
  };

  const getStatusIcon = (direction: string, status: string) => {
    if (status === 'NOANSWER' || status === 'CANCEL' || status === 'BUSY') {
      return <PhoneMissed size={16} className="text-red-500" />;
    }
    if (direction === 'inbound') {
      return <PhoneIncoming size={16} className="text-green-500" />;
    }
    return <PhoneOutgoing size={16} className="text-blue-500" />;
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'ANSWER': 'נענתה',
      'NOANSWER': 'לא נענתה',
      'BUSY': 'תפוס',
      'CANCEL': 'בוטלה',
      'VOICEMAIL': 'תא קולי',
    };
    return statusMap[status] || status;
  };

  const filteredCalls = calls.filter(call => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      call.callerNumber.includes(query) ||
      call.targetNumber.includes(query) ||
      (call.leadName && call.leadName.toLowerCase().includes(query))
    );
  });

  if (!telephony?.config?.isActive) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <Phone size={32} className="mx-auto text-amber-500 mb-3" />
        <h3 className="font-bold text-amber-900 mb-2">טלפוניה לא מוגדרת</h3>
        <p className="text-sm text-amber-700">
          יש להגדיר חיבור ל-Voicenter בהגדרות המערכת כדי לצפות בהיסטוריית שיחות.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Phone size={20} className="text-primary" />
            היסטוריית שיחות
          </h3>
          <p className="text-sm text-slate-500">צפה בכל השיחות שבוצעו דרך המערכת</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => void fetchCallLog()}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי מספר או שם..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-primary outline-none"
          />
        </div>
        
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                dateRange === range
                  ? 'bg-primary text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {range === 'today' ? 'היום' : range === 'week' ? 'שבוע' : 'חודש'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      )}

      {/* Call List */}
      {!isLoading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {filteredCalls.length === 0 ? (
            <div className="p-12 text-center">
              <Phone size={40} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">אין שיחות להצגה</p>
              <p className="text-sm text-slate-400 mt-1">
                {searchQuery ? 'נסה לשנות את החיפוש' : 'שיחות יופיעו כאן לאחר שתבצע שיחות דרך המערכת'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4"
                >
                  {/* Direction Icon */}
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    {getStatusIcon(call.direction, call.status)}
                  </div>

                  {/* Call Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {call.leadName ? (
                        <span className="font-bold text-slate-900 truncate">{call.leadName}</span>
                      ) : (
                        <span className="font-mono text-slate-900" dir="ltr">
                          {formatPhoneNumber(call.direction === 'inbound' ? call.callerNumber : call.targetNumber)}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        call.status === 'ANSWER' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {getStatusText(call.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(call.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(call.duration)}
                      </span>
                    </div>
                  </div>

                  {/* Recording */}
                  {call.recordingUrl && (
                    <a
                      href={call.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                      title="האזן להקלטה"
                    >
                      <Play size={16} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
