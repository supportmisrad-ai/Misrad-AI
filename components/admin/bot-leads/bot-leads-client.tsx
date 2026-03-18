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
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 bg-[#f8fafc] min-h-screen font-sans text-slate-900" dir="rtl">
      
      {/* Header - Clean & Sharp */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">לידים מהבוט</h1>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
              {total.toLocaleString()} לידים
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">ניהול ותיעדוף לידים אוטומטי</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-center px-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase">היום</div>
                <div className="text-base font-bold text-slate-900">
                  {leads.filter(l => new Date().toDateString() === new Date(l.created_at).toDateString()).length}
                </div>
              </div>
              <div className="w-px h-6 bg-slate-100" />
              <div className="text-center px-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase">ממתינים</div>
                <div className="text-base font-bold text-amber-600">
                  {leads.filter(l => l.status === 'new').length}
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Filters Bar - Minimalist */}
      <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 md:space-y-0">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש ליד..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-10 pl-4 py-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer transition-all min-w-[130px]"
            >
              <option value="all">כל הסטטוסים</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none cursor-pointer transition-all min-w-[110px]"
            >
              <option value="all">עדיפות</option>
              {Object.entries(priorityLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile View: Smart Cards */}
      <div className="md:hidden space-y-3">
        {leads.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-900">אין לידים</div>
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm
                      ${(lead.lead_score || 0) > 80 ? 'bg-amber-500' : 'bg-blue-600'}`}>
                      {String(lead.name || 'L').charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{lead.name || 'ללא שם'}</h3>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        {format(new Date(lead.created_at), 'dd/MM HH:mm')}
                        {lead.campaign && <span>• {lead.campaign}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                    lead.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                    lead.status === 'customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    'bg-slate-50 text-slate-600 border-slate-100'
                  }`}>
                    {statusLabels[lead.status] || lead.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                   <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">טלפון</div>
                      <div className="text-xs font-bold text-slate-900" dir="ltr">{lead.phone}</div>
                   </div>
                   <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">ציון</div>
                      <div className={`text-xs font-bold ${(lead.lead_score || 0) > 80 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {lead.lead_score || 0}/100
                      </div>
                   </div>
                </div>

                <div className="flex gap-2">
                  <a href={`tel:${lead.phone}`} className="flex-1 py-2 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100">
                    <Phone className="w-3.5 h-3.5" /> חייג
                  </a>
                  <button 
                    onClick={() => router.push(`/admin/bot-leads/${lead.id}`)}
                    className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800"
                  >
                    פרטים
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Clean Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-10"></th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ליד</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">סטטוס</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">טיפול הבא</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">מקור</th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">ציון</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">נוצר</th>
                <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-medium">
                    אין לידים להצגה כרגע
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4">
                        <button
                          onClick={() => toggleRowExpansion(lead.id)}
                          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${expandedRows.has(lead.id) ? 'text-blue-600 bg-blue-50 rotate-180' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm
                            ${(lead.lead_score || 0) > 80 ? 'bg-amber-500' : 'bg-slate-900'}`}>
                            {String(lead.name || 'L').charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{lead.name || 'ליד ללא שם'}</div>
                            <div className="text-xs text-slate-500 font-medium" dir="ltr">{lead.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                          lead.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                          lead.status === 'customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <CustomDatePicker
                          showHebrewDate
                          value={lead.next_action_date ? new Date(lead.next_action_date).toISOString().split('T')[0] : ''}
                          onChange={(date) => handleUpdateNextAction(lead.id, date)}
                          placeholder="קבע תאריך"
                          className="!h-8 text-xs"
                        />
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-slate-700">{lead.source || '-'}</div>
                        {lead.campaign && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{lead.campaign}</div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          (lead.lead_score || 0) > 80 ? 'bg-amber-50 text-amber-700' : 'text-slate-600'
                        }`}>
                          {lead.lead_score || 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-medium text-slate-900">
                          {format(new Date(lead.created_at), 'dd/MM/yy')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {format(new Date(lead.created_at), 'HH:mm')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/bot-leads/${lead.id}`)}
                            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                          >
                            פרטים
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED ROW */}
                    {expandedRows.has(lead.id) && (
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={8} className="p-6">
                          <div className="grid grid-cols-4 gap-6 text-sm">
                            {/* פרטי בסיס */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">פרטי קשר</h4>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">אימייל:</span>
                                  <span className="font-medium">{lead.email || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">עסק:</span>
                                  <span className="font-medium">{lead.business_name || '-'}</span>
                                </div>
                              </div>
                            </div>

                            {/* נתונים נוספים */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">נתונים נוספים</h4>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">תקציב:</span>
                                  <span className="font-medium">{lead.budget_range || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">תעשייה:</span>
                                  <span className="font-medium">{lead.industry || '-'}</span>
                                </div>
                              </div>
                            </div>
                             
                            {/* הערות */}
                            <div className="col-span-2 space-y-3">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">הערות</h4>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 h-full">
                                <p className="text-slate-700 whitespace-pre-wrap">{lead.notes || 'אין הערות'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex justify-end gap-2">
                             <button onClick={() => router.push(`/admin/bot-leads/${lead.id}`)} className="text-blue-600 text-xs font-bold hover:underline">
                                מעבר לכרטיס ליד מלא &rarr;
                             </button>
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
        
        {/* Pagination */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs font-medium text-slate-500">
            מציג {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} מתוך {total.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
            >
              הקודם
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-50 hover:bg-slate-50"
            >
              הבא
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
