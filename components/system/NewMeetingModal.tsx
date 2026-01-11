'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, Clock, Video, MapPin, User, Save, Bell, MessageSquare, Mail, Smartphone, ArrowRight, Zap, CalendarClock, CheckCircle2, ChevronDown, Search } from 'lucide-react';
import { Lead, CalendarEvent } from './types';
import { motion, AnimatePresence } from 'framer-motion';

interface NewMeetingModalProps {
  leads: Lead[];
  initialLeadId?: string;
  onClose: () => void;
  onSave: (meeting: CalendarEvent) => void;
}

const NewMeetingModal: React.FC<NewMeetingModalProps> = ({ leads, initialLeadId, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'automation'>('details');
  const [isTimingOpen, setIsTimingOpen] = useState(false);
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const leadDropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    leadId: initialLeadId || '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    type: 'zoom' as 'zoom' | 'frontal',
    location: ''
  });

  const [reminders, setReminders] = useState({
      whatsapp: true,
      sms: false,
      email: true,
      timing: 'immediate' as 'immediate' | '1h_before' | '24h_before'
  });

  const [postMeeting, setPostMeeting] = useState({
      enabled: false,
      type: 'thank_you' as 'thank_you' | 'summary' | 'proposal_link',
      delay: '1h_after' as '1h_after' | 'morning_after',
      channel: 'whatsapp' as 'whatsapp' | 'email'
  });

  const timingOptions = [
      { id: 'immediate', label: 'מיד לאחר הקביעה (אישור)', icon: Zap, color: 'text-amber-500' },
      { id: '1h_before', label: 'שעה לפני הפגישה', icon: Clock, color: 'text-indigo-500' },
      { id: '24h_before', label: '24 שעות לפני הפגישה', icon: CalendarClock, color: 'text-slate-500' },
  ];

  const currentTiming = timingOptions.find(o => o.id === reminders.timing) || timingOptions[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (leadDropdownRef.current && !leadDropdownRef.current.contains(event.target as Node)) {
        setIsLeadDropdownOpen(false);
      }
    };

    if (isLeadDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isLeadDropdownOpen]);

  // Filter leads based on search query
  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      (lead.company && lead.company.toLowerCase().includes(query)) ||
      lead.email.toLowerCase().includes(query) ||
      lead.phone.includes(query)
    );
  });

  // Get selected lead
  const selectedLead = leads.find(l => l.id === formData.leadId);

  const getDayNameFromDate = (dateStr: string) => {
      const day = new Date(dateStr).getDay();
      const map = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      return map[day] || 'ראשון';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLead = leads.find(l => l.id === formData.leadId);
    
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: selectedLead ? selectedLead.name : formData.title,
      leadName: selectedLead ? selectedLead.name : formData.title,
      leadCompany: selectedLead?.company || 'לקוח פרטי',
      date: formData.date,
      time: formData.time,
      type: formData.type,
      location: formData.type === 'frontal' ? formData.location : 'שיחת וידאו (זום)',
      dayName: getDayNameFromDate(formData.date),
    };
    
    onSave(newEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-end md:items-center p-0 md:p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 flex flex-col h-[95vh] md:h-auto animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
             <div>
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <Calendar size={20} className="text-primary" />
                     קבע פגישה חדשה
                 </h3>
                 <p className="text-sm text-slate-500 font-medium mt-1">הגדרת זימון ואוטומציה</p>
             </div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
                 <X size={20} />
             </button>
        </div>

        <div className="flex border-b border-slate-100 p-1 bg-white">
            <button 
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}
            >
                פרטי הפגישה
            </button>
            <button 
                onClick={() => setActiveTab('automation')}
                className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'automation' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400'}`}
            >
                <Zap size={14} /> אוטומציה ומעקב
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            
            {activeTab === 'details' && (
                <div className="space-y-6 animate-slide-up">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <User size={16} className="text-slate-400" />
                            עם מי הפגישה?
                        </label>
                        <div className="relative" ref={leadDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsLeadDropdownOpen(!isLeadDropdownOpen)}
                                className={`w-full flex items-center justify-between bg-white border rounded-2xl px-4 py-3.5 shadow-sm hover:border-primary transition-all text-right ${
                                    selectedLead 
                                        ? 'border-primary/30 bg-primary/5' 
                                        : 'border-slate-200 hover:border-slate-300'
                                } ${isLeadDropdownOpen ? 'border-primary ring-2 ring-primary/20' : ''}`}
                            >
                                {selectedLead ? (
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {selectedLead.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0 text-right">
                                            <div className="font-bold text-slate-800 text-sm truncate">{selectedLead.name}</div>
                                            <div className="text-xs text-slate-500 truncate">{selectedLead.company || 'לקוח פרטי'}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-slate-400 font-medium text-sm">-- בחר לקוח מהרשימה --</span>
                                )}
                                <ChevronDown 
                                    size={18} 
                                    className={`text-slate-300 transition-transform duration-300 shrink-0 ${
                                        isLeadDropdownOpen ? 'rotate-180 text-primary' : ''
                                    }`} 
                                />
                            </button>

                            <AnimatePresence>
                                {isLeadDropdownOpen && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsLeadDropdownOpen(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 origin-top overflow-hidden ring-1 ring-slate-900/5"
                                        >
                                            {/* Search Box */}
                                            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                                <div className="relative">
                                                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="חפש לפי שם, חברה, טלפון..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>

                                            {/* Leads List */}
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                {filteredLeads.length === 0 ? (
                                                    <div className="p-6 text-center text-slate-400 text-sm font-medium">
                                                        {searchQuery ? 'לא נמצאו תוצאות' : 'אין לקוחות זמינים'}
                                                    </div>
                                                ) : (
                                                    filteredLeads.map((lead) => (
                                                        <button
                                                            key={lead.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({...formData, leadId: lead.id});
                                                                setIsLeadDropdownOpen(false);
                                                                setSearchQuery('');
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all text-right border-b border-slate-50 last:border-b-0 group ${
                                                                formData.leadId === lead.id ? 'bg-primary/5' : ''
                                                            }`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                                                                formData.leadId === lead.id
                                                                    ? 'bg-gradient-to-br from-rose-500 to-indigo-600 text-white shadow-md'
                                                                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                                            }`}>
                                                                {lead.name.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0 text-right">
                                                                <div className="font-bold text-slate-800 text-sm truncate">{lead.name}</div>
                                                                <div className="text-xs text-slate-500 truncate">
                                                                    {lead.company || 'לקוח פרטי'}
                                                                    {lead.phone && ` • ${lead.phone}`}
                                                                </div>
                                                            </div>
                                                            {formData.leadId === lead.id && (
                                                                <CheckCircle2 size={18} className="text-primary shrink-0" />
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Calendar size={16} className="text-slate-400" />
                                מתי?
                            </label>
                            <input 
                                type="date" 
                                required
                                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                שעה
                            </label>
                            <input 
                                type="time" 
                                required
                                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                                value={formData.time}
                                onChange={e => setFormData({...formData, time: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">סוג פגישה</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, type: 'zoom'})}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.type === 'zoom' ? 'bg-rose-50 border-rose-200 text-primary shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Video size={20} />
                                <span className="text-sm font-bold">זום</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, type: 'frontal'})}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.type === 'frontal' ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <MapPin size={20} />
                                <span className="text-sm font-bold">פרונטלי</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'automation' && (
                <div className="space-y-8 animate-slide-up">
                    
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-5 md:p-6">
                        <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-5">
                            <Bell size={16} className="fill-indigo-600 text-indigo-600" />
                            תזכורות אוטומטיות
                        </h4>
                        
                        <div className="space-y-6">
                            <div className="flex gap-2">
                                {[
                                    { id: 'whatsapp', icon: MessageSquare, label: 'WA', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                    { id: 'email', icon: Mail, label: 'מייל', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                                    { id: 'sms', icon: Smartphone, label: 'SMS', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                                ].map(channel => (
                                    <button
                                        key={channel.id}
                                        type="button"
                                        onClick={() => setReminders({...reminders, [channel.id]: !reminders[channel.id as keyof typeof reminders]})}
                                        className={`flex-1 py-3 px-2 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 ${reminders[channel.id as keyof typeof reminders] ? `bg-white ${channel.border} ${channel.color} shadow-md scale-105` : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                                    >
                                        <channel.icon size={18} />
                                        {channel.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-xs font-bold text-indigo-700 mr-1 uppercase tracking-wider">מתי לשלוח תזכורת?</label>
                                
                                {/* --- DESIGNED CUSTOM DROPDOWN --- */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsTimingOpen(!isTimingOpen)}
                                        className="w-full flex items-center justify-between bg-white border border-indigo-100 rounded-2xl px-4 py-3.5 shadow-sm hover:border-indigo-300 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-slate-50 ${currentTiming.color}`}>
                                                <currentTiming.icon size={16} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{currentTiming.label}</span>
                                        </div>
                                        <ChevronDown size={18} className={`text-slate-300 transition-transform duration-300 ${isTimingOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isTimingOpen && (
                                            <>
                                                <motion.div 
                                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                    className="fixed inset-0 z-40" onClick={() => setIsTimingOpen(false)} 
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-indigo-50 p-2 z-50 origin-top overflow-hidden ring-1 ring-slate-900/5"
                                                >
                                                    {timingOptions.map((opt) => (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setReminders({...reminders, timing: opt.id as any});
                                                                setIsTimingOpen(false);
                                                            }}
                                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-right group ${reminders.timing === opt.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <opt.icon size={16} className={`${reminders.timing === opt.id ? opt.color : 'text-slate-400 group-hover:text-indigo-400'}`} />
                                                                <span className="text-sm font-bold">{opt.label}</span>
                                                            </div>
                                                            {reminders.timing === opt.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`rounded-3xl p-5 md:p-6 border transition-all ${postMeeting.enabled ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center mb-5">
                            <h4 className={`text-sm font-bold flex items-center gap-2 ${postMeeting.enabled ? 'text-emerald-900' : 'text-slate-500'}`}>
                                <ArrowRight size={16} className={postMeeting.enabled ? 'text-emerald-600' : 'text-slate-400'} />
                                מעקב לאחר פגישה
                            </h4>
                            <div 
                                onClick={() => setPostMeeting({...postMeeting, enabled: !postMeeting.enabled})}
                                className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${postMeeting.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${postMeeting.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        {postMeeting.enabled && (
                            <div className="space-y-5 animate-fade-in">
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'thank_you', label: 'תודה' },
                                        { id: 'summary', label: 'סיכום AI' },
                                        { id: 'proposal_link', label: 'הצעה' },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setPostMeeting({...postMeeting, type: opt.id as any})}
                                            className={`py-2 rounded-xl text-[10px] font-bold border transition-colors ${postMeeting.type === opt.id ? 'bg-white border-emerald-300 text-emerald-700 shadow-md scale-105' : 'bg-emerald-100/30 border-transparent text-emerald-600'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase mr-1">מתי?</label>
                                        <select 
                                            value={postMeeting.delay}
                                            onChange={(e) => setPostMeeting({...postMeeting, delay: e.target.value as any})}
                                            className="w-full bg-white border border-emerald-100 text-xs font-bold text-emerald-800 rounded-xl py-2.5 px-3 focus:ring-0 cursor-pointer"
                                        >
                                            <option value="1h_after">שעה אחרי</option>
                                            <option value="morning_after">בוקר למחרת</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase mr-1">ערוץ</label>
                                        <div className="flex bg-white rounded-xl border border-emerald-100 p-1">
                                            <button 
                                                type="button" 
                                                onClick={() => setPostMeeting({...postMeeting, channel: 'whatsapp'})}
                                                className={`flex-1 rounded-lg text-[10px] py-1.5 transition-colors ${postMeeting.channel === 'whatsapp' ? 'bg-emerald-100 text-emerald-700 font-black' : 'text-slate-400'}`}
                                            >
                                                WA
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setPostMeeting({...postMeeting, channel: 'email'})}
                                                className={`flex-1 rounded-lg text-[10px] py-1.5 transition-colors ${postMeeting.channel === 'email' ? 'bg-emerald-100 text-emerald-700 font-black' : 'text-slate-400'}`}
                                            >
                                                MAIL
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}

            <div className="pt-4 mt-auto">
                <button 
                    type="submit"
                    className="w-full bg-onyx-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-onyx-900/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                    <Save size={20} />
                    שמור ושלח זימון
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default NewMeetingModal;
