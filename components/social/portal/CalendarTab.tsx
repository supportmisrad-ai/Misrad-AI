'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SocialPost, SocialPlatform } from '@/types/social';
import { PLATFORM_ICONS } from '../SocialIcons';
import { Calendar as CalIcon, Clock, Image, ExternalLink } from 'lucide-react';

interface CalendarTabProps {
  posts: SocialPost[];
}

const CalendarTab: React.FC<CalendarTabProps> = ({ posts }) => {
  // Sort posts by date
  const visiblePosts = posts
    .filter(p => p.status === 'scheduled' || p.status === 'published' || p.status === 'pending_approval')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Group posts by date
  const groupedPosts: Record<string, SocialPost[]> = {};
  visiblePosts.forEach(post => {
    const date = new Date(post.scheduledAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', weekday: 'long' });
    if (!groupedPosts[date]) groupedPosts[date] = [];
    groupedPosts[date].push(post);
  });

  return (
    <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">לוח השידורים שלי</h2>
          <p className="text-slate-400 font-bold mt-1">כל התוכן המתוכנן והמאושר שלך במקום אחד.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
             <span className="text-[10px] font-black text-slate-400">מתוזמן</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-green-500 rounded-full"></div>
             <span className="text-[10px] font-black text-slate-400">פורסם</span>
           </div>
        </div>
      </div>

      <div className="flex flex-col gap-12 relative">
        {/* The Timeline Line */}
        <div className="absolute top-0 bottom-0 right-6 w-1 bg-slate-100 rounded-full hidden md:block"></div>

        {Object.entries(groupedPosts).length > 0 ? Object.entries(groupedPosts).map(([date, dayPosts]) => (
          <div key={date} className="flex flex-col gap-6 relative">
            <div className="flex items-center gap-6 relative z-10">
               <div className="w-12 h-12 bg-white border-4 border-slate-100 rounded-full hidden md:flex items-center justify-center text-blue-600 shadow-sm">
                  <CalIcon size={20}/>
               </div>
               <h3 className="text-xl font-black text-slate-800 bg-slate-50 px-6 py-2 rounded-full border border-slate-100">{date}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:pr-20">
              {dayPosts.map(post => (
                <div key={post.id} className="bg-white p-6 rounded-[48px] border-2 border-transparent hover:border-blue-500 shadow-xl transition-all group cursor-pointer relative">
                   <div className="aspect-square bg-slate-50 rounded-[32px] overflow-hidden mb-6 relative">
                      {post.mediaUrl ? (
                        <img src={post.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Image size={48} />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 flex gap-2">
                        {post.platforms.map(plat => {
                           const Icon = PLATFORM_ICONS[plat as SocialPlatform];
                           return Icon ? (
                             <div key={plat} className="w-10 h-10 bg-white/95 backdrop-blur rounded-xl flex items-center justify-center text-slate-900 shadow-lg">
                               <Icon size={18}/>
                             </div>
                           ) : null;
                        })}
                      </div>
                   </div>

                   <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase">
                           <Clock size={12}/> {new Date(post.scheduledAt).getHours()}:00
                         </div>
                         <span className={`px-4 py-1 rounded-xl font-black text-[10px] uppercase ${
                           post.status === 'published' ? 'bg-green-50 text-green-600' : 
                           post.status === 'pending_approval' ? 'bg-amber-50 text-amber-600' :
                           'bg-blue-50 text-blue-600'
                         }`}>
                           {post.status === 'published' ? 'שודר' : post.status === 'pending_approval' ? 'ממתין לאישור' : 'מתוזמן'}
                         </span>
                      </div>
                      <p className="font-bold text-slate-700 leading-relaxed italic line-clamp-2">"{post.content}"</p>
                      <button className="flex items-center gap-2 text-[10px] font-black text-blue-600 group-hover:underline">
                         צפה בפוסט המלא <ExternalLink size={12}/>
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="py-32 text-center text-slate-300 font-bold bg-white rounded-[64px] border-2 border-dashed flex flex-col items-center gap-6">
             <CalIcon size={48} className="opacity-20" />
             <p className="text-xl">אין תוכן מתוזמן כרגע בלוח השידורים</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CalendarTab;

