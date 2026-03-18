'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, TrendingUp, UserPlus, Clock, Phone, Mail, Building2, Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';

type BotLeadStatus = 'new' | 'qualified' | 'demo_booked' | 'trial' | 'customer' | 'churned' | 'unsubscribed';

interface BotLead {
  id: string;
  phone: string;
  name: string | null;
  business_name: string | null;
  email: string | null;
  industry: string | null;
  org_size: string | null;
  pain_point: string | null;
  selected_plan: string | null;
  source: string | null;
  status: BotLeadStatus;
  score: number;
  last_interaction: string;
  created_at: string;
  _count?: { conversations: number };
}

interface BotConversation {
  id: string;
  direction: string;
  message: string;
  rule_id: string | null;
  variables: Record<string, unknown> | null;
  created_at: string;
}

interface DashboardStats {
  totalLeads: number;
  newToday: number;
  demosBooked: number;
  trials: number;
  customers: number;
  conversationsToday: number;
}

const STATUS_LABELS: Record<BotLeadStatus, { label: string; color: string }> = {
  new: { label: 'חדש', color: 'bg-blue-100 text-blue-800' },
  qualified: { label: 'מסווג', color: 'bg-yellow-100 text-yellow-800' },
  demo_booked: { label: 'דמו נקבע', color: 'bg-purple-100 text-purple-800' },
  trial: { label: 'ניסיון', color: 'bg-green-100 text-green-800' },
  customer: { label: 'לקוח', color: 'bg-emerald-100 text-emerald-800' },
  churned: { label: 'נטש', color: 'bg-red-100 text-red-800' },
  unsubscribed: { label: 'הוסר', color: 'bg-gray-100 text-gray-600' },
};

export default function BotDashboardClient() {
  const [leads, setLeads] = useState<BotLead[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BotLeadStatus | 'all'>('all');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [conversations, setConversations] = useState<BotConversation[]>([]);
  const [convoLoading, setConvoLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/bot?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLeads(data.leads ?? []);
      setStats(data.stats ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleConversation = async (leadId: string) => {
    if (expandedLead === leadId) {
      setExpandedLead(null);
      return;
    }
    setExpandedLead(leadId);
    setConvoLoading(true);
    try {
      const res = await fetch(`/api/admin/bot/conversations?leadId=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
      // silent
    } finally {
      setConvoLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">בוט וואטסאפ</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">ניהול לידים, שיחות וסטטיסטיקות מהבוט.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 font-bold">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="admin-pro-card p-4 hover:border-indigo-300">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
              <Users className="h-3 w-3" />
              סה״כ לידים
            </div>
            <p className="text-2xl font-black mt-1 text-slate-900 tabular-nums">{stats.totalLeads}</p>
          </div>
          <div className="admin-pro-card p-4 hover:border-blue-300">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase">
              <UserPlus className="h-3 w-3" />
              חדשים היום
            </div>
            <p className="text-2xl font-black mt-1 text-blue-700 tabular-nums">{stats.newToday}</p>
          </div>
          <div className="admin-pro-card p-4 hover:border-purple-300">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase">
              <Clock className="h-3 w-3" />
              דמואים
            </div>
            <p className="text-2xl font-black mt-1 text-purple-700 tabular-nums">{stats.demosBooked}</p>
          </div>
          <div className="admin-pro-card p-4 hover:border-green-300">
            <div className="flex items-center gap-2 text-xs font-bold text-green-600 uppercase">
              <TrendingUp className="h-3 w-3" />
              בניסיון
            </div>
            <p className="text-2xl font-black mt-1 text-green-700 tabular-nums">{stats.trials}</p>
          </div>
          <div className="admin-pro-card p-4 hover:border-emerald-300">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase">
              <Users className="h-3 w-3" />
              לקוחות
            </div>
            <p className="text-2xl font-black mt-1 text-emerald-700 tabular-nums">{stats.customers}</p>
          </div>
          <div className="admin-pro-card p-4 hover:border-slate-300">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
              <MessageSquare className="h-3 w-3" />
              שיחות היום
            </div>
            <p className="text-2xl font-black mt-1 text-slate-900 tabular-nums">{stats.conversationsToday}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="admin-pro-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="חפש לפי שם, טלפון, עסק..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 bg-slate-50 border-transparent focus:bg-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'new', 'qualified', 'demo_booked', 'trial', 'customer', 'churned'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  statusFilter === s
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? 'הכל' : STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="admin-pro-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">רשימת לידים ({leads.length})</h3>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold">טוען...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold">אין לידים עדיין. כשהבוט יתחיל לפעול, הנתונים יופיעו כאן.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr>
                  <th className="admin-table-header">שם</th>
                  <th className="admin-table-header">טלפון</th>
                  <th className="admin-table-header hidden md:table-cell">עסק</th>
                  <th className="admin-table-header hidden lg:table-cell">תעשייה</th>
                  <th className="admin-table-header">סטטוס</th>
                  <th className="admin-table-header hidden md:table-cell">ציון</th>
                  <th className="admin-table-header hidden lg:table-cell">אינטראקציה אחרונה</th>
                  <th className="admin-table-header w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <tr
                      className="admin-table-row cursor-pointer"
                      onClick={() => toggleConversation(lead.id)}
                    >
                      <td className="admin-table-cell font-bold text-slate-900">{lead.name ?? '—'}</td>
                      <td className="admin-table-cell font-mono text-xs text-slate-600" dir="ltr">{lead.phone}</td>
                      <td className="admin-table-cell hidden md:table-cell text-slate-600">{lead.business_name ?? '—'}</td>
                      <td className="admin-table-cell hidden lg:table-cell text-slate-600">{lead.industry ?? '—'}</td>
                      <td className="admin-table-cell">
                        <span className={`badge-pro ${STATUS_LABELS[lead.status]?.color?.replace('bg-', 'bg-').replace('text-', 'text-') ?? ''}`}>
                          {STATUS_LABELS[lead.status]?.label ?? lead.status}
                        </span>
                      </td>
                      <td className="admin-table-cell hidden md:table-cell font-mono font-bold text-slate-700">{lead.score}</td>
                      <td className="admin-table-cell hidden lg:table-cell text-slate-400 text-xs">{formatDate(lead.last_interaction)}</td>
                      <td className="admin-table-cell">
                        {expandedLead === lead.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </td>
                    </tr>
                    {expandedLead === lead.id && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div className="bg-slate-50/50 border-b border-slate-100 p-5">
                            {/* Lead details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                              {lead.email && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                                  <span dir="ltr">{lead.phone}</span>
                                </div>
                              )}
                              {lead.business_name && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{lead.business_name}</span>
                                </div>
                              )}
                              {lead.org_size && <div className="text-slate-600"><span className="font-bold text-slate-700">גודל:</span> {lead.org_size}</div>}
                              {lead.pain_point && <div className="text-slate-600"><span className="font-bold text-slate-700">צורך:</span> {lead.pain_point}</div>}
                              {lead.selected_plan && <div className="text-slate-600"><span className="font-bold text-slate-700">חבילה:</span> {lead.selected_plan}</div>}
                              {lead.source && <div className="text-slate-600"><span className="font-bold text-slate-700">מקור:</span> {lead.source}</div>}
                            </div>
                            
                            {/* Conversations */}
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">היסטוריית שיחה</h4>
                            {convoLoading ? (
                              <p className="text-xs text-slate-400 font-medium">טוען שיחות...</p>
                            ) : conversations.length === 0 ? (
                              <p className="text-xs text-slate-400 font-medium">אין שיחות עדיין</p>
                            ) : (
                              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {conversations.map((c) => (
                                  <div 
                                    key={c.id} 
                                    className={`text-sm p-3 rounded-xl max-w-[80%] ${
                                      c.direction === 'in' 
                                        ? 'bg-white border border-slate-200 mr-auto rounded-tr-none' 
                                        : 'bg-indigo-50 border border-indigo-100 ml-auto rounded-tl-none'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center gap-4 mb-1">
                                      <span className={`text-[10px] font-bold uppercase ${c.direction === 'in' ? 'text-slate-500' : 'text-indigo-600'}`}>
                                        {c.direction === 'in' ? 'לקוח' : 'בוט'}
                                      </span>
                                      <span className="text-[10px] text-slate-400">{formatDate(c.created_at)}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{c.message}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
