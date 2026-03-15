'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BotLeadDTO, GetBotLeadsParams, getBotLeads, updateBotLeadStatus, updateBotLeadAssignment } from '@/app/actions/bot-leads';
import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import { Search, Filter, MoreHorizontal, ChevronDown, CheckCircle2, User, Phone, Mail, Building2, Star, Clock, Tags, Users } from 'lucide-react';

interface BotLeadsClientProps {
  initialLeads: BotLeadDTO[];
  initialTotal: number;
  campaigns: string[];
}

const statusLabels: Record<string, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  qualified: 'מועמד',
  demo_scheduled: 'דמו מתוזמן',
  demo_completed: 'דמו הושלם',
  proposal_sent: 'הצעת מחיר נשלחה',
  negotiation: 'במשא ומתן',
  trial: 'בתקופת ניסיון',
  customer: 'לקוח',
  churned: 'נטש',
  lost: 'אבוד',
  unsubscribed: 'הסיר הרשמה',
};

const priorityLabels: Record<string, string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
  urgent: 'דחוף',
};

export function BotLeadsClient({ initialLeads, initialTotal, campaigns }: BotLeadsClientProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<BotLeadDTO[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<GetBotLeadsParams>({
    status: 'all',
    priority: 'all',
    campaign: 'all',
    assignedTo: 'all',
    pageSize: 50,
  });

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getBotLeads({
        ...filters,
        search: search || undefined,
        page,
        pageSize,
      });
      setLeads(result.leads);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, search, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const toggleRowExpansion = (leadId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId);
    } else {
      newExpanded.add(leadId);
    }
    setExpandedRows(newExpanded);
  };

  const handleUpdateNextAction = async (leadId: string, date: string) => {
    try {
      // Here we would call a server action to update next_action_date
      // For now, updating local state
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, next_action_date: date ? new Date(date) : null } : l));
    } catch (error) {
      console.error('Failed to update next action date:', error);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 bg-[#f8fafc] min-h-screen font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">לידים מהבוט</h1>
          </div>
          <p className="text-slate-500 font-bold mr-12">ניהול חכם של לידים מבלאסטר וואטסאפ • {total.toLocaleString()} סה"כ</p>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Quick Stats Summary */}
           <div className="hidden lg:flex items-center gap-6 px-6 py-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">חדשים היום</div>
                <div className="text-lg font-black text-blue-600">
                  {leads.filter(l => new Date().toDateString() === new Date(l.created_at).toDateString()).length}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ממתינים</div>
                <div className="text-lg font-black text-amber-500">
                  {leads.filter(l => l.status === 'new').length}
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Modern Filters Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="חיפוש חופשי (שם, טלפון, אימייל...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pr-11 pl-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Select */}
            <div className="relative min-w-[160px]">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer transition-all pr-4 pl-10"
              >
                <option value="all">כל הסטטוסים</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Priority Select */}
            <div className="relative min-w-[140px]">
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer transition-all pr-4 pl-10"
              >
                <option value="all">כל העדיפויות</option>
                {Object.entries(priorityLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Campaign Select */}
            <div className="relative min-w-[180px]">
              <select
                value={filters.campaign}
                onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer transition-all pr-4 pl-10"
              >
                <option value="all">כל הקמפיינים</option>
                {campaigns.map((campaign) => (
                  <option key={campaign} value={campaign}>{campaign}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-5 w-12 text-right"></th>
                <th className="p-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">ליד</th>
                <th className="p-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">סטטוס</th>
                <th className="p-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">טיפול הבא</th>
                <th className="p-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">מקור וקמפיין</th>
                <th className="p-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">ציון</th>
                <th className="p-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">נוצר</th>
                <th className="p-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-slate-50 mb-4">
                      <Users className="w-10 h-10 text-slate-200" />
                    </div>
                    <div className="text-xl font-black text-slate-900">אין לידים להצגה</div>
                    <p className="text-slate-400 font-bold mt-1">הלידים יופיעו כאן כשהבוט יתחיל לשלוח נתונים</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <tr className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-5">
                        <button
                          onClick={() => toggleRowExpansion(lead.id)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${expandedRows.has(lead.id) ? 'bg-blue-600 text-white shadow-md shadow-blue-200 rotate-180' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 border border-slate-200 flex items-center justify-center shadow-sm">
                              <span className="text-lg font-black text-blue-600">{String(lead.name || lead.first_name || 'ל').charAt(0)}</span>
                            </div>
                            {lead.has_media && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-sm" title="כולל מדיה" />
                            )}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                              {lead.name || lead.first_name || 'ליד ללא שם'}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-bold text-slate-400 tracking-tight">{lead.phone}</span>
                              {lead.priority && lead.priority !== 'medium' && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                                  lead.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                  lead.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                  'bg-slate-50 text-slate-500 border-slate-100'
                                }`}>
                                  {priorityLabels[lead.priority]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[11px] font-black border transition-all ${
                          lead.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm shadow-blue-50' : 
                          lead.status === 'customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-50' :
                          lead.status === 'lost' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                          'bg-white text-slate-700 border-slate-200'
                        }`}>
                          {lead.status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="p-5 min-w-[200px]">
                        <CustomDatePicker
                          showHebrewDate
                          value={lead.next_action_date ? new Date(lead.next_action_date).toISOString().split('T')[0] : ''}
                          onChange={(date) => handleUpdateNextAction(lead.id, date)}
                          placeholder="קבע טיפול הבא"
                          className="!h-9"
                        />
                      </td>
                      <td className="p-5">
                        <div className="text-[13px] font-black text-slate-700">{lead.source || 'לא ידוע'}</div>
                        {lead.campaign && (
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5 line-clamp-1 max-w-[150px]">{lead.campaign}</div>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-sm border ${
                          (lead.lead_score || 0) > 80 ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-50' :
                          (lead.lead_score || 0) > 50 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {lead.lead_score || 0}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="text-[11px] font-black text-slate-700">
                          {format(new Date(lead.created_at), 'dd/MM/yy', { locale: he })}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {format(new Date(lead.created_at), 'HH:mm')}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/bot-leads/${lead.id}`)}
                            className="h-10 px-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98]"
                          >
                            פרטים מלאים
                          </button>
                          <button className="w-10 h-10 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED ROW - MODERNIZED GRID */}
                    {expandedRows.has(lead.id) && (
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <td colSpan={8} className="p-8">
                          <div className="max-w-[1400px] mx-auto">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-[1.25rem] shadow-lg shadow-blue-200">
                                  <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">סקירת ליד מורחבת</h3>
                              </div>
                              <div className="flex gap-3">
                                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 transition-all">הורד PDF</button>
                                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-50 transition-all">ייצא ל-CRM</button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                              {/* Column 1: Basic Info */}
                              <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">פרטי בסיס</h4>
                                <div className="space-y-4">
                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <User className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">שם מלא</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 pr-6.5">{lead.name || '-'}</div>
                                  </div>
                                  
                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">טלפון ישיר</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 pr-6.5" dir="ltr">{lead.phone}</div>
                                  </div>

                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">אימייל</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 pr-6.5 truncate">{lead.email || '-'}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Company & Industry */}
                              <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] mb-4">חברה ותעשייה</h4>
                                <div className="space-y-4">
                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-purple-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">שם העסק</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 pr-6.5">{lead.business_name || '-'}</div>
                                  </div>

                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-purple-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <Star className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">תעשייה</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 pr-6.5">{lead.industry || '-'}</div>
                                  </div>

                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-purple-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <Users className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">גודל ארגון</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 pr-6.5">{lead.org_size || '-'}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Column 3: Intent & Sales */}
                              <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">מכירות ומוצר</h4>
                                <div className="space-y-4">
                                  <div className="group bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm hover:border-emerald-200 transition-all">
                                    <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">תוכנית נבחרת</div>
                                    <div className="text-sm font-black text-slate-900">{lead.selected_plan || '-'}</div>
                                    {lead.plan_price && <div className="text-xs font-black text-emerald-600 mt-1">₪{lead.plan_price} לחודש</div>}
                                  </div>

                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">נקודת כאב</div>
                                    <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-3">{lead.pain_point || 'לא צוין'}</p>
                                  </div>

                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">תקציב</div>
                                    <div className="text-sm font-black text-slate-900">{lead.budget_range || '-'}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Column 4: Dates & Tracking */}
                              <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-4">זמנים ומעקב</h4>
                                <div className="space-y-4">
                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-amber-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">נוצר לראשונה</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 pr-6.5">{format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                  </div>

                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-amber-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">אינטראקציה אחרונה</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 pr-6.5">{lead.last_interaction ? format(new Date(lead.last_interaction), 'dd/MM/yyyy') : '-'}</div>
                                  </div>

                                  <div className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-amber-200 transition-all">
                                    <div className="flex items-center gap-3 mb-1">
                                      <Tags className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-400 uppercase">תגיות</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2 pr-6.5">
                                      {lead.tags.length > 0 ? lead.tags.map((tag, idx) => (
                                        <span key={idx} className="text-[9px] font-black px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100">{tag}</span>
                                      )) : '-'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Notes Section */}
                            {lead.notes && (
                              <div className="mt-8 bg-blue-50/30 p-6 rounded-[2rem] border border-blue-100">
                                <div className="text-[10px] font-black text-blue-600 uppercase mb-3">הערות ומידע נוסף</div>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
                              </div>
                            )}

                            {/* Action Buttons Footer */}
                            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center gap-3">
                              <button
                                onClick={() => router.push(`/admin/bot-leads/${lead.id}`)}
                                className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98]"
                              >
                                עריכת ליד מלאה
                              </button>
                              <button className="px-8 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all">
                                שלח וואטסאפ מהיר
                              </button>
                              <button className="mr-auto h-12 w-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all" title="מחק ליד">
                                <Tags className="w-5 h-5 rotate-45" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-400">מציג {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} מתוך {total.toLocaleString()} לידים</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 disabled:opacity-50 transition-all"
            >
              הקודם
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 disabled:opacity-50 transition-all"
            >
              הבא
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
