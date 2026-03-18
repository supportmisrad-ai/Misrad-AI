
import React from 'react';
import { Calendar, MessageCircle, MessageSquareQuote, Download, UserCircle } from 'lucide-react';
import { Client, Meeting } from '../../types';
import { useRouter } from 'next/navigation';

interface PortalConciergeProps {
  client: Client;
  clientMeetings: Meeting[];
}

const toast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message, type } }));
};

export const PortalConcierge: React.FC<PortalConciergeProps> = ({ client, clientMeetings }) => {
  const router = useRouter();
  
  // Extract manager info from metadata
  const metadata = (client.internalNotes && typeof client.internalNotes === 'object') ? client.internalNotes as Record<string, unknown> : {};
  const pmName = (metadata.assignedManagerName as string) || client.mainContact || 'מנהל הפרויקט';
  const pmPhone = (metadata.assignedManagerPhone as string) || '';
  const pmEmail = (metadata.assignedManagerEmail as string) || '';
  
  const pmInitials = pmName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('');

  const handleScheduleMeeting = () => {
    toast('פותח דף תיאום פגישות...', 'info');
    router.push('/booking');
  };

  const handleScheduleCall = () => {
    router.push('/booking');
  };

  const handleWhatsApp = () => {
    if (pmPhone) {
      const cleanPhone = pmPhone.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(`שלום ${pmName}, אשמח לדבר איתך בנוגע לפרויקט`);
      window.open(`https://wa.me/972${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}?text=${message}`, '_blank');
    } else {
      toast('לא נמצא מספר טלפון למנהל הפרויקט', 'error');
    }
  };

  return (
    <div className="animate-slide-up space-y-12 max-w-5xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-display font-bold text-slate-900">מי מטפל בי?</h2>
          <p className="text-slate-500 mt-2 text-lg">הקשר האישי שלך מול הצוות שלנו.</p>
        </div>
        <button
          onClick={handleScheduleMeeting}
          className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
        >
          <Calendar size={18} /> תאם פגישה חדשה
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-nexus-primary via-nexus-accent to-nexus-primary" />
            <div className="w-32 h-32 rounded-[32px] bg-gradient-to-br from-nexus-primary to-nexus-accent flex items-center justify-center text-white text-4xl font-black mx-auto mb-6 ring-4 ring-slate-50">
              {pmInitials}
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{pmName}</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 mb-2">מנהל הפרויקט האישי שלך</p>
            {pmEmail && (
              <p className="text-xs text-slate-500 mb-6">{pmEmail}</p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-10">
              <UserCircle size={16} />
              <span>זמין לשיחה ותיאום</span>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleScheduleCall}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-bold text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                <Calendar size={20} /> תאם שיחה בלו"ז
              </button>
              <button
                onClick={handleWhatsApp}
                className="w-full py-5 bg-green-500 text-white rounded-3xl font-bold text-sm hover:bg-green-600 flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
              >
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
