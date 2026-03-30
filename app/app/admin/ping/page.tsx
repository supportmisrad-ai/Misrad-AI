'use client';

/**
 * Ping Dashboard — דשבורד שיחות
 * 
 * מציג סקירה של כל השיחות הפעילות, סטטיסטיקות, ושיחות דורשות תשומת לב.
 * Pro Minimalist design — מינימליסטי, יעיל, בעברית.
 */

import React, { useState } from 'react';
import { MessageSquare, TrendingUp, AlertCircle, Clock, CheckCircle2, ChevronLeft, Filter, Search, RefreshCw, ListChecks, Globe } from 'lucide-react';
import Link from 'next/link';

// Types
interface ShichahStats {
  active: number;
  today: number;
  needsAttention: number;
  avgResponseTime: string;
}

interface ShichahRow {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  status: 'active' | 'pending' | 'urgent';
  hasUnread: boolean;
  channel: 'whatsapp' | 'sms';
}

// Mock data — יוחלף ב-data אמיתי מה-API
const mockStats: ShichahStats = {
  active: 12,
  today: 24,
  needsAttention: 3,
  avgResponseTime: '2 דקות',
};

const mockShichot: ShichahRow[] = [
  {
    id: '1',
    contactName: 'יוסי כהן',
    contactPhone: '050-1234567',
    lastMessage: 'מתעניין בשירות שלכם לניהול לקוחות',
    lastMessageTime: '09:15',
    status: 'urgent',
    hasUnread: true,
    channel: 'whatsapp',
  },
  {
    id: '2',
    contactName: 'שרה לוי',
    contactPhone: '052-9876543',
    lastMessage: 'תודה על העזרה, אני בודקת את ההצעה',
    lastMessageTime: '08:42',
    status: 'active',
    hasUnread: false,
    channel: 'whatsapp',
  },
  {
    id: '3',
    contactName: 'דוד מזרחי',
    contactPhone: '054-5551212',
    lastMessage: 'האם אפשר לקבוע פגישה להשבוע הבא?',
    lastMessageTime: '08:30',
    status: 'pending',
    hasUnread: true,
    channel: 'whatsapp',
  },
  {
    id: '4',
    contactName: 'רחל אברהם',
    contactPhone: '053-4443332',
    lastMessage: 'הבוט שאל על מספר עובדים',
    lastMessageTime: '07:55',
    status: 'active',
    hasUnread: false,
    channel: 'whatsapp',
  },
];

// Components
function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string;
  color: 'emerald' | 'blue' | 'amber' | 'rose';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-white/50`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-xs font-medium opacity-80">{label}</div>
          <div className="text-xl font-black">{value}</div>
          {trend && <div className="text-[10px] font-medium opacity-70">{trend}</div>}
        </div>
      </div>
    </div>
  );
}

function ShichahRow({ shichah }: { shichah: ShichahRow }) {
  const statusClasses = {
    active: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    urgent: 'bg-rose-100 text-rose-700',
  };

  const statusLabels = {
    active: 'פעילה',
    pending: 'מחכה',
    urgent: 'דחוף',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
        {shichah.contactName.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-sm">{shichah.contactName}</span>
          {shichah.hasUnread && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
        </div>
        <div className="text-xs text-slate-500 truncate">{shichah.contactPhone}</div>
        <div className={`text-xs truncate mt-0.5 ${shichah.hasUnread ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
          {shichah.lastMessage}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1.5">
        <span className="text-[10px] font-medium text-slate-400">{shichah.lastMessageTime}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusClasses[shichah.status]}`}>
          {statusLabels[shichah.status]}
        </span>
        {shichah.channel === 'whatsapp' && (
          <span className="text-[10px] text-emerald-600 font-medium">וואטסאפ</span>
        )}
      </div>

      {/* Action */}
      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}

export default function PingDashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  const filteredShichot = mockShichot.filter(shichah => {
    if (filter === 'unread' && !shichah.hasUnread) return false;
    if (filter === 'urgent' && shichah.status !== 'urgent') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        shichah.contactName.toLowerCase().includes(q) ||
        shichah.contactPhone.includes(q) ||
        shichah.lastMessage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">דשבורד שיחות</h1>
          <p className="text-sm text-slate-500">המערכת שמנהלת את השיחות שלך — גם פנימה, גם החוצה</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={16} />
            רענן
          </button>
          <Link 
            href="/app/admin/ping/sheelonim"
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            <MessageSquare size={16} />
            שאלון חדש
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard 
          icon={MessageSquare} 
          label="שיחות פעילות"
          value={mockStats.active}
          trend="+3 מהבוקר"
          color="emerald"
        />
        <StatsCard 
          icon={TrendingUp} 
          label="היום"
          value={mockStats.today}
          trend="24 הודעות"
          color="blue"
        />
        <StatsCard 
          icon={AlertCircle} 
          label="דורשים תשומת לב"
          value={mockStats.needsAttention}
          trend="דחוף"
          color="amber"
        />
        <StatsCard 
          icon={Clock} 
          label="זמן תגובה ממוצע"
          value={mockStats.avgResponseTime}
          trend="הבוט עונה מיד"
          color="emerald"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="חיפוש שיחה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              filter === 'unread' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            לא נקראו
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              filter === 'urgent' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            דחוף
          </button>
        </div>
      </div>

      {/* Shichot List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">שיחות אחרונות</h2>
          <span className="text-xs text-slate-500">{filteredShichot.length} שיחות</span>
        </div>
        <div className="divide-y divide-slate-50">
          {filteredShichot.map(shichah => (
            <ShichahRow key={shichah.id} shichah={shichah} />
          ))}
        </div>
        {filteredShichot.length === 0 && (
          <div className="p-8 text-center">
            <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">אין שיחות לתצוגה</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          href="/app/admin/ping/tshuvot"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">תשובות מוכנות</div>
              <div className="text-xs text-slate-500">הגדר מה הבוט עונה</div>
            </div>
          </div>
        </Link>
        <Link 
          href="/app/admin/ping/sheelonim"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
              <ListChecks size={20} />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">שאלונים</div>
              <div className="text-xs text-slate-500">צור שאלות אוטומטיות</div>
            </div>
          </div>
        </Link>
        <Link 
          href="/app/admin/ping/chiburim"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100">
              <Globe size={20} />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">חיבורים</div>
              <div className="text-xs text-slate-500">הגדר וואטסאפ וערוצים</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
