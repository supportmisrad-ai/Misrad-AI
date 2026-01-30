'use client';

import React, { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Lead, PipelineStage } from './types';
import { STAGES } from './constants';
import { Search, Filter, Phone, MessageSquare, FileDown, Facebook, Instagram, Globe, User, MoreHorizontal, ArrowRight, Mail, Clock } from 'lucide-react';
import { useToast } from './contexts/ToastContext';
import LogCallModal from './LogCallModal';
import { createSystemLeadActivity } from '@/app/actions/system-leads';
import { uploadCallRecordingFile } from '@/app/actions/files';

interface ContactsViewProps {
  leads: Lead[];
  viewMode?: 'all' | 'leads' | 'contacts';
  onLeadClick: (lead: Lead) => void;
}

const ContactsView: React.FC<ContactsViewProps> = ({ leads, viewMode = 'all', onLeadClick }) => {
  const { addToast } = useToast();
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PipelineStage | 'all'>('all');
  const [logCallLead, setLogCallLead] = useState<Lead | null>(null);

  // Rule 9: Performance Strategy - Memoized Filtering
  const filteredLeads = useMemo(() => {
      return leads.filter(lead => {
        const matchesSearch = 
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.phone.includes(searchTerm);
        
        let matchesMode = true;
        if (viewMode === 'contacts') matchesMode = lead.status === 'won' || lead.status === 'lost';
        else if (viewMode === 'leads') matchesMode = lead.status !== 'won' && lead.status !== 'lost';

        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
        return matchesSearch && matchesStatus && matchesMode;
      });
  }, [leads, searchTerm, statusFilter, viewMode]);

  const handleExport = () => {
      addToast('רשימת אנשי הקשר יוצאה לקובץ CSV', 'success');
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('facebook')) return <Facebook size={14} className="text-[#1877F2]" />;
    if (s.includes('instagram')) return <Instagram size={14} className="text-[#E1306C]" />;
    return <Globe size={14} className="text-slate-400" />;
  };

  const orgSlugFromPathname = () => {
    const parts = String(pathname || '').split('/').filter(Boolean);
    const wIndex = parts.indexOf('w');
    if (wIndex === -1) return null;
    return parts[wIndex + 1] || null;
  };

  const handleQuickCall = (lead: Lead) => {
    const phone = String((lead as any)?.phone || '').trim();
    if (!phone) return;
    window.location.href = `tel:${phone}`;
    setLogCallLead(lead);
  };

  return (
    <div className="p-0 md:p-8 max-w-[1920px] mx-auto animate-fade-in h-full flex flex-col pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-4 md:px-0 pt-4 md:pt-0">
        <div>
           <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
             {viewMode === 'contacts' ? 'ארכיון לקוחות' : viewMode === 'leads' ? 'ניהול לידים פעיל' : 'ספר טלפונים'}
           </h2>
           <p className="text-slate-500 font-medium text-sm">
               {filteredLeads.length} רשומות נמצאו במערכת.
           </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={handleExport}
                className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center w-full md:w-auto gap-2 hover:bg-slate-50 transition-colors shadow-sm"
            >
                <FileDown size={16} /> ייצוא ל-Excel
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 mx-4 md:mx-0 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
                type="text" 
                placeholder="חיפוש לפי שם, טלפון או אימייל..." 
                className="w-full pl-4 pr-12 py-3 bg-slate-50 md:bg-transparent rounded-xl md:rounded-none text-sm focus:outline-none font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="h-auto w-px bg-slate-200 mx-2 hidden md:block"></div>
        <div className="flex gap-2">
            <div className="relative w-full md:min-w-[200px]">
                <select 
                    className="w-full h-full pl-4 pr-10 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-600 focus:outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors border border-transparent focus:border-indigo-200 focus:bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                    <option value="all">כל הסטטוסים</option>
                    {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
        </div>
      </div>

      {/* Desktop: High Density Table */}
      <div className="hidden md:flex bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex-col">
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-right whitespace-nowrap">
                <thead className="bg-slate-900 text-slate-300 font-bold text-xs uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-md">
                    <tr>
                        <th className="px-6 py-4 text-white">שם ופרטים</th>
                        <th className="px-6 py-4">סטטוס</th>
                        <th className="px-6 py-4">מאיפה הגיע?</th>
                        <th className="px-6 py-4">שווי (כסף)</th>
                        <th className="px-6 py-4">מתי דיברנו?</th>
                        <th className="px-6 py-4 text-center">פעולות מהירות</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead) => (
                        <tr 
                          key={lead.id} 
                          onClick={() => onLeadClick(lead)}
                          className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                        >
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm border border-slate-200 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{lead.name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5 font-medium">{lead.company || lead.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                    lead.status === 'won' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    lead.status === 'lost' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                    lead.status === 'negotiation' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-indigo-50 text-indigo-700 border-indigo-100'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                        lead.status === 'won' ? 'bg-emerald-500' :
                                        lead.status === 'lost' ? 'bg-slate-400' :
                                        lead.status === 'negotiation' ? 'bg-amber-500' :
                                        'bg-indigo-500'
                                    }`}></span>
                                    {STAGES.find(s => s.id === lead.status)?.label}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm text-slate-500">
                                        {getSourceIcon(lead.source)}
                                    </div>
                                    <span className="text-slate-600 text-xs font-bold">{lead.source}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-700 group-hover:text-slate-900">
                                ₪{lead.value.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-slate-700 text-xs font-bold">{new Date(lead.lastContact).toLocaleDateString('he-IL')}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{new Date(lead.lastContact).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${String((lead as any)?.phone ?? '').replace(/-/g, '')}`, '_blank'); }} 
                                        className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                                        title="וואטסאפ"
                                    >
                                        <MessageSquare size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleQuickCall(lead); }} 
                                        className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                        title="חייג"
                                    >
                                        <Phone size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Mobile: Card List (Responsive Friendly) */}
      <div className="md:hidden flex-1 overflow-y-auto px-4 pb-20">
          <div className="space-y-3">
              {filteredLeads.map(lead => (
                  <div 
                    key={lead.id} 
                    onClick={() => onLeadClick(lead)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 cursor-pointer active:bg-slate-50 transition-colors"
                  >
                      
                      {/* Card Header */}
                      <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                                  {lead.name.charAt(0)}
                              </div>
                              <div>
                                  <div className="font-bold text-slate-800 text-base">{lead.name}</div>
                                  <div className="text-xs text-slate-500">{lead.company || 'לקוח פרטי'}</div>
                              </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold border ${
                                lead.status === 'won' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                'bg-indigo-50 text-indigo-700 border-indigo-100'
                            }`}>
                                {STAGES.find(s => s.id === lead.status)?.label}
                          </span>
                      </div>

                      {/* Card Stats */}
                      <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-slate-50">
                          <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">שווי עסקה</div>
                              <div className="text-sm font-mono font-bold text-slate-700">₪{lead.value.toLocaleString()}</div>
                          </div>
                          <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">תקשורת אחרונה</div>
                              <div className="text-sm font-medium text-slate-600 flex items-center gap-1">
                                  <Clock size={12} />
                                  {new Date(lead.lastContact).toLocaleDateString('he-IL')}
                              </div>
                          </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                          <button 
                              onClick={(e) => { e.stopPropagation(); handleQuickCall(lead); }}
                              className="flex-1 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-200"
                          >
                              <Phone size={14} /> חייג
                          </button>
                          <button 
                              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${String((lead as any)?.phone ?? '').replace(/-/g, '')}`, '_blank'); }}
                              className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-emerald-100"
                          >
                              <MessageSquare size={14} /> וואטסאפ
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      <LogCallModal
        open={Boolean(logCallLead)}
        leadName={String(logCallLead?.name || '')}
        leadPhone={String((logCallLead as any)?.phone || '')}
        onCloseAction={() => setLogCallLead(null)}
        onUploadRecordingAction={async (file: File) => {
          const lead = logCallLead;
          if (!lead) return;
          const orgSlug = orgSlugFromPathname();
          if (!orgSlug) {
            addToast('לא ניתן להעלות הקלטה (orgSlug חסר)', 'error');
            return;
          }

          const uploadRes = await uploadCallRecordingFile(file, file.name, String(lead.id), orgSlug);
          if (!uploadRes.success) {
            addToast(uploadRes.error || 'שגיאה בהעלאת הקלטה', 'error');
            return;
          }

          const fd = new FormData();
          fd.append('file', file);

          const transcribeRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/transcribe`, {
            method: 'POST',
            body: fd,
          });

          if (!transcribeRes.ok) {
            const err = await transcribeRes.json().catch(() => ({} as any));
            addToast(err?.error || 'שגיאה בתמלול', 'error');
            return;
          }

          const transcribeJson = (await transcribeRes.json().catch(() => ({} as any))) as any;
          const transcriptText = String(transcribeJson?.transcriptText || '').trim();
          if (!transcriptText) {
            addToast('תמלול ריק', 'error');
            return;
          }

          const suggestRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/suggest`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ transcriptText }),
          });

          if (!suggestRes.ok) {
            const err = await suggestRes.json().catch(() => ({} as any));
            addToast(err?.error || 'שגיאה בניתוח', 'error');
            return;
          }

          const suggestJson = (await suggestRes.json().catch(() => ({} as any))) as any;
          const analysisResult = suggestJson?.result || {};
          const summaryText = String(analysisResult?.summary || '').trim();

          const activityContent = summaryText ? `ניתוח שיחה (AI):\n${summaryText}` : 'ניתוח שיחה (AI)';
          const res = await createSystemLeadActivity({
            orgSlug,
            leadId: String(lead.id),
            type: 'call',
            content: activityContent,
            direction: 'outbound',
            metadata: {
              callAnalysis: {
                kind: 'call_recording_ai',
                audio: {
                  bucket: (uploadRes as any).bucket,
                  path: uploadRes.path,
                  url: uploadRes.url,
                  signedUrl: (uploadRes as any).signedUrl,
                  fileName: file.name,
                  mimeType: file.type,
                },
                transcriptText,
                analysis: analysisResult,
              },
            },
          });

          if (!res.ok) {
            addToast(res.message || 'שגיאה בשמירת פעילות ניתוח שיחה', 'error');
            return;
          }

          addToast('הקלטה נותחה ונשמרה', 'success');
          setLogCallLead(null);
        }}
        onSaveAction={async (content) => {
          const lead = logCallLead;
          if (!lead) return;
          const text = String(content || '').trim();
          if (!text) return;

          const orgSlug = orgSlugFromPathname();
          if (!orgSlug) {
            addToast('לא ניתן לשמור סיכום שיחה (orgSlug חסר)', 'error');
            return;
          }

          const res = await createSystemLeadActivity({
            orgSlug,
            leadId: String(lead.id),
            type: 'call',
            content: text,
            direction: 'outbound',
          });

          if (!res.ok) {
            addToast(res.message || 'שגיאה בשמירת סיכום שיחה', 'error');
            return;
          }

          addToast('סיכום השיחה נשמר', 'success');
          setLogCallLead(null);
        }}
      />

    </div>
  );
};

export default ContactsView;
