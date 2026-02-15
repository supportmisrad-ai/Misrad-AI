
import React from 'react';
import { Calendar, MessageCircle, MessageSquareQuote, Download } from 'lucide-react';
import { Client, Meeting } from '../../types';

interface PortalConciergeProps {
  client: Client;
  clientMeetings: Meeting[];
}

export const PortalConcierge: React.FC<PortalConciergeProps> = ({ client, clientMeetings }) => {
  return (
    <div className="animate-slide-up space-y-12 max-w-5xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-display font-bold text-slate-900">מי מטפל בי?</h2>
          <p className="text-slate-500 mt-2 text-lg">הקשר האישי שלך מול הצוות שלנו.</p>
        </div>
        <button className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg">
          <Calendar size={18} /> תאם פגישה חדשה
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-[48px] p-10 shadow-sm text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-nexus-accent"></div>
            <div className="w-32 h-32 rounded-[40px] bg-slate-900 mx-auto mb-8 overflow-hidden border-4 border-slate-50 shadow-2xl transition-transform duration-500 group-hover:scale-105">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" className="w-full h-full object-cover" alt="PM" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900">יוסי כהן</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 mb-10">מנהל הפרויקט האישי שלך</p>
            
            <div className="space-y-4">
              <button className="w-full py-5 bg-slate-900 text-white rounded-3xl font-bold text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl">
                <Calendar size={20} /> תאם שיחה בלו"ז
              </button>
              <button className="w-full py-5 bg-green-500 text-white rounded-3xl font-bold text-sm hover:bg-green-600 flex items-center justify-center gap-3 shadow-lg shadow-green-500/20">
                <MessageCircle size={20} /> שלח הודעת וואטסאפ
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <h3 className="font-bold text-2xl text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquareQuote size={24} className="text-nexus-accent" /> היסטוריית פגישות
          </h3>
          <div className="space-y-4">
            {clientMeetings.map(meeting => (
              <div key={meeting.id} className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-md hover:border-nexus-accent/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-lg leading-tight">{meeting.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${meeting.location === 'ZOOM' ? 'bg-blue-50 text-blue-600' : 'bg-[color:var(--os-accent)]/10 text-[color:var(--os-accent)]'}`}>{meeting.location}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-bold mt-1 block">{meeting.date}</span>
                  </div>
                  <button className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-nexus-primary group-hover:bg-nexus-accent/10 transition-all"><Download size={20}/></button>
                </div>
                <p className="text-sm text-slate-500 italic leading-relaxed border-r-2 border-slate-100 pr-4 line-clamp-2">
                  "{meeting.aiAnalysis?.summary || 'סיכום הפגישה מעובד...'}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
