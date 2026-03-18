'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Clock, Image, Eye, Link as LinkIcon, Unlink, RefreshCw, SquareActivity, ShieldCheck, StickyNote, Save } from 'lucide-react';
import { Client, SocialPost, ClientRequest, SocialPlatform } from '@/types/social';
import { PLATFORM_ICONS, PLATFORM_COLORS } from '../SocialIcons';
import { syncGoogleCalendar } from '@/app/actions/integrations';
import { updateClientForWorkspace } from '@/app/actions/clients';
import { useApp } from '@/contexts/AppContext';

interface OverviewTabProps {
  client: Client;
  posts: SocialPost[];
  requests: ClientRequest[];
  onEditPost: (post: SocialPost) => void;
  onEnterPortal: () => void;
  setActiveTab: (tab: unknown) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ client, posts, requests, onEditPost, onEnterPortal, setActiveTab }) => {
  const { orgSlug, addToast } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const [internalNote, setInternalNote] = useState(client.internalNotes || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncGoogleCalendar();
      if (result.success) {
        addToast(`סנכרון הושלם: ${result.events?.length || 0} אירועים נטענו`, 'success');
      } else {
        addToast(result.error || 'שגיאה בסנכרון', 'error');
      }
    } catch (error) {
      addToast('שגיאה בסנכרון', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const saveInternalNote = () => {
    void (async () => {
      setIsSavingNote(true);
      try {
        const resolvedOrgSlug = String(orgSlug || '').trim();
        if (!resolvedOrgSlug || !client.id) {
          addToast('חסר ארגון או לקוח פעיל', 'error');
          return;
        }
        const res = await updateClientForWorkspace(resolvedOrgSlug, client.id, { internalNotes: internalNote });
        if (res.success) {
          addToast('הפתק נשמר בהצלחה');
        } else {
          addToast(res.error || 'שגיאה בשמירת הפתק', 'error');
        }
      } catch {
        addToast('שגיאה בשמירת הפתק', 'error');
      } finally {
        setIsSavingNote(false);
      }
    })();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Connection Status Card */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">חיבורי API פעילים</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">ניהול טוקנים וגישה ישירה לחשבונות</p>
              </div>
              <button 
                onClick={handleGlobalSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold hover:bg-indigo-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed border border-indigo-100/50"
              >
                <RefreshCw size={14} className={isSyncing ? 'opacity-60' : undefined}/> 
                {isSyncing ? 'מסנכרן...' : 'סנכרן טוקנים'}
              </button>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              {client.activePlatforms.map(p => {
                const Icon = PLATFORM_ICONS[p];
                const color = PLATFORM_COLORS[p];
                return Icon ? (
                  <div key={p} className="p-4 md:p-5 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col items-center gap-3 relative group hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                     <div className={`p-3 rounded-xl bg-white shadow-sm border border-slate-100/50 ${color} group-hover:scale-110 transition-transform`}><Icon size={24}/></div>
                     <div className="flex flex-col items-center gap-1">
                        <span className="text-[11px] font-bold text-slate-700 capitalize">{p}</span>
                        <div className="flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                           <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">חיבור פעיל</span>
                        </div>
                     </div>
                     
                     <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                        <button title="הגדרות חיבור" className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm"><SquareActivity size={12}/></button>
                        <button title="נתק" className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 shadow-sm"><Unlink size={12}/></button>
                     </div>
                  </div>
                ) : null;
              })}
              <button
                 onClick={() => addToast('חיבור רשתות חדשות יהיה זמין בקרוב', 'info')}
                 className="p-4 md:p-5 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group"
              >
                 <div className="w-10 h-10 rounded-xl border border-dashed border-slate-300 flex items-center justify-center group-hover:border-indigo-400 transition-all">
                    <LinkIcon size={20}/>
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-wide">חבר רשת</span>
              </button>
           </div>
           
           <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <p className="text-[10px] font-medium text-slate-500">כל החיבורים מאובטחים באמצעות Infrastructure Key והרשאות מוגבלות.</p>
           </div>
        </div>

        {/* WORKLOAD / INTERNAL NOTES (THE TEAM ADDITION) */}
        <div className="bg-amber-50/80 p-6 md:p-8 rounded-3xl border border-amber-200/50 shadow-sm flex flex-col gap-5 relative overflow-hidden">
           <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl border border-amber-200/50"><StickyNote size={20}/></div>
                 <h3 className="text-lg font-bold text-slate-900">לוח הערות צוות פנימי</h3>
              </div>
              <span className="text-[9px] font-bold text-amber-700 bg-white/80 px-2.5 py-1 rounded-md border border-amber-200 uppercase tracking-widest shadow-sm">גלוי למשרד בלבד</span>
           </div>
           
           <div className="relative z-10 flex flex-col">
              <textarea 
                value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
                placeholder="הערות חשובות לצוות: דגשים לגרפיקאי, הערות למנהל הלקוח, היסטוריית בעיות..."
                className="w-full h-32 bg-white/80 border border-amber-200/60 rounded-2xl p-4 font-medium text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all resize-none shadow-sm placeholder:text-slate-400"
              />
              <div className="mt-3 flex justify-end">
                <button 
                  onClick={saveInternalNote}
                  disabled={isSavingNote || internalNote === client.internalNotes}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-0 disabled:pointer-events-none"
                >
                  <Save size={14} className={isSavingNote ? 'opacity-60' : undefined} /> {isSavingNote ? 'שומר...' : 'שמור פתק'}
                </button>
              </div>
           </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-5 text-slate-900">פוסט קרוב לשידור</h3>
          {posts.length > 0 ? (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-48 aspect-[4/3] md:aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                {posts[0].mediaUrl ? <img src={posts[0].mediaUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={32}/></div>}
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed line-clamp-3">"{posts[0].content}"</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-3 flex items-center gap-1.5"><Clock size={12}/> {new Date(posts[0].scheduledAt).toLocaleDateString('he-IL')} בשעה {new Date(posts[0].scheduledAt).getHours()}:00</p>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  {posts[0].platforms.map(p => {
                    const Icon = PLATFORM_ICONS[p];
                    return Icon ? <div key={p} className="p-1.5 bg-slate-50 rounded-md border border-slate-200 text-slate-500"><Icon size={12}/></div> : null;
                  })}
                  <button onClick={() => onEditPost(posts[0])} className="mr-auto text-indigo-600 font-bold text-xs hover:text-indigo-700 hover:underline">עריכה מהירה</button>
                </div>
              </div>
            </div>
          ) : <div className="py-8 text-center text-slate-400 font-medium text-sm">אין פוסטים מתוזמנים כרגע</div>}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-sm relative overflow-hidden group border border-slate-800">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-3">פורטל לקוח אקטיבי</h3>
            <p className="text-slate-400 font-medium text-sm leading-relaxed mb-6">הלקוח רואה את התכנים שלו ומאשר אותם בפורטל ייעודי.</p>
            <button onClick={onEnterPortal} className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
              <Eye size={16}/> כניסה לפורטל
            </button>
          </div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold mb-5 text-slate-900">בקשות אחרונות</h3>
          <div className="flex flex-col gap-3">
            {requests.length > 0 ? requests.slice(0, 3).map(req => (
              <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 group hover:border-indigo-200 transition-all">
                {req.mediaUrl && <img src={req.mediaUrl} className="w-10 h-10 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate text-slate-800">{req.content}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(req.timestamp).toLocaleDateString('he-IL')}</p>
                </div>
              </div>
            )) : (
              <p className="text-xs font-medium text-slate-400 text-center py-4">אין בקשות חדשות מהפורטל</p>
            )}
          </div>
          <button onClick={() => setActiveTab('requests')} className="w-full mt-4 py-2.5 bg-slate-50 text-slate-600 font-bold text-[11px] rounded-xl hover:bg-slate-100 border border-slate-100 transition-all">לכל הבקשות</button>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;

