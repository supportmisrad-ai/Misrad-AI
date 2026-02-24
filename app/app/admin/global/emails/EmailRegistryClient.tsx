'use client';

import React, { useMemo, useState } from 'react';
import {
  Mail,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Users,
  Building2,
  CreditCard,
  LifeBuoy,
  Server,
  Megaphone,
  UserPlus,
  Star,
  Send,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EMAIL_CATALOG, EMAIL_SENDERS, type EmailCategory, type EmailTypeDefinition, type SenderKey } from '@/lib/email-registry';

// ─── Category metadata ─────────────────────────────────────────────
const CATEGORY_META: Record<EmailCategory, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  transactional: { label: 'טרנזקציונלי', color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', icon: Shield },
  onboarding: { label: 'קליטה', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', icon: UserPlus },
  team: { label: 'צוות', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: Users },
  organization: { label: 'ארגון', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: Building2 },
  billing: { label: 'חיוב', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: CreditCard },
  support: { label: 'תמיכה', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', icon: LifeBuoy },
  system: { label: 'מערכת', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', icon: Server },
  marketing: { label: 'שיווק', color: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', icon: Megaphone },
};

const AUDIENCE_LABELS: Record<string, string> = {
  user: 'משתמש',
  admin: 'אדמין',
  owner: 'בעלים',
  billing_contact: 'איש קשר לחיוב',
  all_team: 'כל הצוות',
};

type FilterStatus = 'all' | 'implemented' | 'not_implemented';

function getSenderDisplay(email: EmailTypeDefinition): { address: string; name: string } {
  const key = (email.senderKey || email.category) as SenderKey;
  const sender = EMAIL_SENDERS[key] || EMAIL_SENDERS.transactional;
  return { address: sender.address, name: sender.name };
}

export default function EmailRegistryClient() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EmailCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set<EmailCategory>();
    EMAIL_CATALOG.forEach((e) => cats.add(e.category));
    return Array.from(cats);
  }, []);

  const filtered = useMemo(() => {
    return EMAIL_CATALOG.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (statusFilter === 'implemented' && !e.implemented) return false;
      if (statusFilter === 'not_implemented' && e.implemented) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const sender = getSenderDisplay(e);
        return (
          e.id.toLowerCase().includes(q) ||
          e.label.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.trigger.toLowerCase().includes(q) ||
          sender.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = EMAIL_CATALOG.length;
    const implemented = EMAIL_CATALOG.filter((e) => e.implemented).length;
    const notImplemented = total - implemented;
    return { total, implemented, notImplemented };
  }, []);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, EmailTypeDefinition[]> = {};
    for (const email of filtered) {
      if (!groups[email.category]) groups[email.category] = [];
      groups[email.category].push(email);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-indigo-600" />
            רישום מיילים
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            קטלוג מלא של כל המיילים הנשלחים מהמערכת
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Send className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stats.total}</div>
              <div className="text-xs font-bold text-slate-500">סה״כ סוגי מיילים</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600">{stats.implemented}</div>
              <div className="text-xs font-bold text-slate-500">מיושמים ופעילים</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-amber-600">{stats.notImplemented}</div>
              <div className="text-xs font-bold text-slate-500">ממתינים ליישום</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, תיאור, טריגר, כתובת שולח..."
              className="pr-10 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1"
          >
            <Filter className="h-4 w-4" />
            סינון
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {/* Category filter */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                הכל
              </button>
              {categories.map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      categoryFilter === cat
                        ? `${meta.bgColor} ${meta.color} ring-1 ${meta.borderColor}`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Status filter */}
            <div className="flex gap-1 mr-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                הכל
              </button>
              <button
                onClick={() => setStatusFilter('implemented')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'implemented'
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                פעיל
              </button>
              <button
                onClick={() => setStatusFilter('not_implemented')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'not_implemented'
                    ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ממתין
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email List by Category */}
      {Object.entries(groupedByCategory).map(([cat, emails]) => {
        const meta = CATEGORY_META[cat as EmailCategory];
        if (!meta) return null;
        const Icon = meta.icon;

        return (
          <div key={cat} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Category Header */}
            <div className={`px-5 py-3 ${meta.bgColor} border-b ${meta.borderColor} flex items-center gap-2`}>
              <Icon className={`h-4 w-4 ${meta.color}`} />
              <span className={`text-sm font-black ${meta.color}`}>{meta.label}</span>
              <span className="text-xs font-bold text-slate-400 mr-auto">{emails.length} מיילים</span>
            </div>

            {/* Email Rows */}
            <div className="divide-y divide-slate-100">
              {emails.map((email) => {
                const sender = getSenderDisplay(email);
                const isExpanded = expandedId === email.id;

                return (
                  <div key={email.id} className="group">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : email.id)}
                      className="w-full px-5 py-3.5 flex items-center gap-3 text-right hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Status badge */}
                      {email.implemented ? (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" title="פעיל" />
                      ) : (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-amber-400" title="ממתין" />
                      )}

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{email.label}</div>
                        <div className="text-xs text-slate-500 truncate">{email.description}</div>
                      </div>

                      {/* Audience */}
                      <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                        {AUDIENCE_LABELS[email.audience] || email.audience}
                      </span>

                      {/* Unsubscribe */}
                      {email.canUnsubscribe && (
                        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600">
                          ביטול הרשמה
                        </span>
                      )}

                      {/* Expand */}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-1 bg-slate-50/50 border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailItem label="מזהה" value={email.id} mono />
                          <DetailItem label="קטגוריה" value={meta.label} />
                          <DetailItem label="כתובת שולח" value={`${sender.name} <${sender.address}>`} mono />
                          <DetailItem label="קהל יעד" value={AUDIENCE_LABELS[email.audience] || email.audience} />
                          <DetailItem label="טריגר" value={email.trigger} />
                          <DetailItem label="מפתח העדפה" value={email.preferenceKey} mono />
                          <DetailItem
                            label="סטטוס"
                            value={email.implemented ? 'מיושם ופעיל' : 'ממתין ליישום'}
                            valueColor={email.implemented ? 'text-emerald-600' : 'text-amber-600'}
                          />
                          <DetailItem
                            label="ביטול הרשמה"
                            value={email.canUnsubscribe ? 'ניתן לביטול' : 'לא ניתן לביטול'}
                            valueColor={email.canUnsubscribe ? 'text-blue-600' : 'text-slate-500'}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <Mail className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <div className="text-sm font-bold text-slate-500">לא נמצאו מיילים תואמים</div>
          <div className="text-xs text-slate-400 mt-1">נסה לשנות את החיפוש או הסינון</div>
        </div>
      )}

      {/* Sender Addresses Reference */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-l from-indigo-50 to-white border-b border-indigo-100 flex items-center gap-2">
          <Bell className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-black text-indigo-700">כתובות שולח</span>
        </div>
        <div className="divide-y divide-slate-100">
          {Object.entries(EMAIL_SENDERS).map(([key, sender]) => (
            <div key={key} className="px-5 py-3 flex items-center gap-4">
              <div className="w-24 text-xs font-black text-slate-500 uppercase">{key}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900">{sender.name}</div>
                <div className="text-xs font-mono text-slate-500">{sender.address}</div>
              </div>
              <div className="hidden sm:block text-xs text-slate-400 max-w-xs truncate">{sender.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Star icon for rating */}
      <span className="hidden"><Star /><Bell /></span>
    </div>
  );
}

// ─── Detail Item Component ──────────────────────────────────────────
function DetailItem({
  label,
  value,
  mono,
  valueColor,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-xs font-bold ${valueColor || 'text-slate-700'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}
