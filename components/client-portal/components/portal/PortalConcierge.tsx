import React from 'react';
import { 
  MessageSquareQuote, 
  Calendar, 
  MessageCircle, 
  Download,
  Brain,
  Zap,
  Target,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Meeting, Client, ServicePlan } from '../../types';

interface PortalConciergeProps {
  client: Client;
  clientMeetings: Meeting[];
  servicePlans?: ServicePlan[];
}

export const PortalConcierge: React.FC<PortalConciergeProps> = ({ 
  client, 
  clientMeetings,
  servicePlans = []
}) => {
  // Find the active phase and upcoming template
  const activePlan = servicePlans.find(p => p.status === 'ACTIVE');
  const activePhase = activePlan?.phases.find(p => 
    p.status === 'ACTIVE' || 
    (p.status === 'PENDING' && !activePlan.phases.some(prevP => prevP.order < p.order && prevP.status !== 'COMPLETED'))
  );
  const upcomingTemplate = activePhase?.templates.find(t => 
    !activePhase.meetings.some(m => m.templateId === t.id)
  );

  return (
    <div className="animate-slide-up space-y-10 max-w-6xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">הקונסיירז'</h2>
          <p className="text-slate-500 mt-2 text-lg">הקשר האישי שלך מול הצוות שלנו.</p>
        </div>
        <button className="hidden md:flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg">
          <Calendar size={18} /> תאם פגישה חדשה
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          {/* AI Brief: What to expect next */}
          {upcomingTemplate && (
            <div className="bg-gradient-to-br from-nexus-primary to-nexus-accent rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                    <Brain size={20} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">הכנה למפגש הבא</span>
                </div>
                
                <h3 className="text-2xl font-bold mb-4">במפגש הקרוב: {upcomingTemplate.title}</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-6 font-medium">
                  "אנחנו הולכים להתמקד בפיצוח {upcomingTemplate.agenda[0]}. המטרה שלנו היא לצאת עם {upcomingTemplate.successCriteria[0]}."
                </p>
                
                <div className="space-y-3 bg-black/10 p-5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 block">מה להכין?</span>
                  <ul className="text-xs space-y-2 font-bold">
                    {upcomingTemplate.agenda.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-nexus-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* PM Card */}
          <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-nexus-primary via-nexus-accent to-nexus-primary" />
            <div className="w-32 h-32 rounded-3xl overflow-hidden mx-auto mb-6 ring-4 ring-slate-50 bg-gradient-to-br from-nexus-primary to-nexus-accent flex items-center justify-center text-white text-4xl font-bold">
              {client.mainContact.charAt(0)}
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{client.mainContactRole || 'מנהל הפרויקט'}</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 mb-10">איש הקשר האישי שלך</p>

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
            {clientMeetings.length > 0 ? clientMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white p-6 rounded-3xl border border-slate-100 hover:shadow-md hover:border-nexus-accent/30 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-lg leading-tight">{meeting.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          meeting.location === 'ZOOM' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                        }`}
                      >
                        {meeting.location}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-bold mt-1 block">{meeting.date}</span>
                  </div>
                  {meeting.aiAnalysis && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                      <Zap size={12} fill="currentColor" /> מנותח AI
                    </div>
                  )}
                  <button className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-nexus-primary group-hover:bg-nexus-accent/10 transition-all">
                    <Download size={20} />
                  </button>
                </div>
                <p className="text-sm text-slate-500 italic leading-relaxed border-r-2 border-slate-100 pr-4 line-clamp-2">
                  "{meeting.aiAnalysis?.summary || 'סיכום הפגישה מעובד...'}"
                </p>
              </div>
            )) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold">עדיין לא היו פגישות מתועדות.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
