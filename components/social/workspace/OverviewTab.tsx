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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 flex flex-col gap-8">
        {/* Connection Status Card */}
        <div className="bg-white p-10 rounded-[44px] border border-slate-200 shadow-xl relative overflow-hidden">
           <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-2xl font-black">חיבורי API פעילים</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">ניהול טוקנים וגישה ישירה לחשבונות</p>
              </div>
              <button 
                onClick={handleGlobalSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <div key={p} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 relative group hover:bg-white hover:shadow-lg transition-all">
                     <div className={`p-4 rounded-2xl bg-white shadow-sm ${color} group-hover:scale-110 transition-transform`}><Icon size={28}/></div>
                     <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-black capitalize">{p}</span>
                        <div className="flex items-center gap-1.5">
                           <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                           <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">חיבור פעיל</span>
                        </div>
                     </div>
                     
                     <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                        <button title="הגדרות חיבור" className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 shadow-sm"><SquareActivity size={12}/></button>
                        <button title="נתק" className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 shadow-sm"><Unlink size={12}/></button>
                     </div>
                  </div>
                ) : null;
              })}
              <button
                 onClick={() => addToast('חיבור רשתות חדשות יהיה זמין בקרוב', 'info')}
                 className="p-6 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all group"
              >
                 <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center group-hover:border-blue-400 transition-all">
                    <LinkIcon size={24}/>
                 </div>
                 <span className="text-[10px] font-black uppercase">חבר רשת נוספת</span>
              </button>
           </div>
           
           <div className="mt-8 pt-8 border-t border-slate-200 flex items-center gap-3">
              <ShieldCheck size={18} className="text-green-500" />
              <p className="text-[10px] font-bold text-slate-400">כל החיבורים מאובטחים באמצעות Infrastructure Key והרשאות מוגבלות.</p>
           </div>
        </div>

        {/* WORKLOAD / INTERNAL NOTES (THE TEAM ADDITION) */}
        <div className="bg-yellow-50 p-10 rounded-[44px] border-2 border-yellow-200 shadow-xl flex flex-col gap-6 relative overflow-hidden">
           <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-yellow-400 text-slate-900 rounded-2xl shadow-lg"><StickyNote size={24}/></div>
                 <h3 className="text-2xl font-black text-slate-900">לוח הערות צוות פנימי</h3>
              </div>
              <span className="text-[10px] font-black text-yellow-600 bg-white px-3 py-1 rounded-lg border border-yellow-200 uppercase tracking-widest">גלוי למשרד בלבד</span>
           </div>
           
           <div className="relative z-10">
              <textarea 
                value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
                placeholder="הערות חשובות לצוות: דגשים לגרפיקאי, הערות למנהל הלקוח, היסטוריית בעיות..."
                className="w-full h-40 bg-white/60 border border-yellow-200 rounded-3xl p-6 font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 ring-yellow-100 transition-all resize-none shadow-inner"
              />
              <button 
                onClick={saveInternalNote}
                disabled={isSavingNote || internalNote === client.internalNotes}
                className="absolute bottom-4 left-4 bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-black transition-all disabled:opacity-0 disabled:pointer-events-none"
              >
                <Save size={14} className={isSavingNote ? 'opacity-60' : undefined} /> {isSavingNote ? 'שומר...' : 'שמור פתק'}
              </button>
           </div>

           <div className="absolute top-0 left-0 w-40 h-40 bg-yellow-200/20 rounded-full blur-3xl -z-0"></div>
        </div>

        <div className="bg-white p-10 rounded-[44px] border border-slate-200 shadow-xl">
          <h3 className="text-2xl font-black mb-8">פוסט קרוב לשידור</h3>
          {posts.length > 0 ? (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-56 aspect-square rounded-[32px] overflow-hidden bg-slate-100 shadow-lg shrink-0">
                {posts[0].mediaUrl ? <img src={posts[0].mediaUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={48}/></div>}
              </div>
              <div className="flex-1 flex flex-col justify-between py-2">
                <div>
                  <p className="text-2xl font-bold text-slate-800 italic leading-relaxed line-clamp-3">"{posts[0].content}"</p>
                  <p className="text-xs font-black text-slate-400 mt-4 flex items-center gap-2"><Clock size={14}/> {new Date(posts[0].scheduledAt).toLocaleDateString('he-IL')} בשעה {new Date(posts[0].scheduledAt).getHours()}:00</p>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  {posts[0].platforms.map(p => {
                    const Icon = PLATFORM_ICONS[p];
                    return Icon ? <div key={p} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-400"><Icon size={14}/></div> : null;
                  })}
                  <button onClick={() => onEditPost(posts[0])} className="mr-auto text-blue-600 font-black text-xs hover:underline">עריכה מהירה</button>
                </div>
              </div>
            </div>
          ) : <div className="py-12 text-center text-slate-300 font-bold">אין פוסטים מתוזמנים כרגע</div>}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-4">פורטל לקוח אקטיבי</h3>
            <p className="text-slate-400 font-bold text-sm leading-relaxed mb-6">הלקוח רואה את התכנים שלו ומאשר אותם בפורטל ייעודי.</p>
            <button onClick={onEnterPortal} className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
              <Eye size={18}/> כניסה לפורטל הלקוח
            </button>
          </div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl group-hover:scale-150 transition-all duration-1000"></div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl">
          <h3 className="text-lg font-black mb-6">בקשות אחרונות מהלקוח</h3>
          <div className="flex flex-col gap-4">
            {requests.length > 0 ? requests.slice(0, 3).map(req => (
              <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 group hover:border-blue-200 transition-all">
                {req.mediaUrl && <img src={req.mediaUrl} className="w-12 h-12 rounded-xl object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate text-slate-800">{req.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(req.timestamp).toLocaleDateString('he-IL')}</p>
                </div>
              </div>
            )) : (
              <p className="text-xs font-bold text-slate-300 text-center py-6">אין בקשות חדשות מהפורטל</p>
            )}
          </div>
          <button onClick={() => setActiveTab('requests')} className="w-full mt-4 py-3 bg-slate-50 text-slate-400 font-black text-[10px] rounded-xl hover:bg-slate-100 transition-all">לכל הבקשות</button>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;

