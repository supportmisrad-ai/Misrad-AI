'use client';

import React, { useState } from 'react';
import { Plus, Image, Edit3, Trash2, Download, Copy, CircleCheckBig, Clock } from 'lucide-react';
import { Client, SocialPost, AIOpportunity } from '@/types/social';
import { PLATFORM_ICONS } from '../SocialIcons';
import { useApp } from '@/contexts/AppContext';
import ContentOnboardingTooltip from '../ContentOnboardingTooltip';

interface ContentTabProps {
  client: Client;
  posts: SocialPost[];
  onNewPost: (context?: Partial<AIOpportunity>) => void;
  onEditPost: (post: SocialPost) => void;
  onDeletePost: (postId: string) => void;
}

const ContentTab: React.FC<ContentTabProps> = ({ client, posts, onNewPost, onEditPost, onDeletePost }) => {
  const { addToast } = useApp();
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const handleDownloadMedia = async (post: SocialPost) => {
    if (!post.mediaUrl) {
      addToast('אין מדיה להורדה', 'error');
      return;
    }

    try {
      const response = await fetch(post.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `post-${post.id}.${post.mediaUrl.split('.').pop()?.split('?')[0] || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('המדיה הורדה בהצלחה! 📥');
    } catch (error) {
      console.error('Error downloading media:', error);
      addToast('שגיאה בהורדת המדיה', 'error');
    }
  };

  const handleCopyText = async (post: SocialPost) => {
    try {
      await navigator.clipboard.writeText(post.content);
      setCopiedPostId(post.id);
      addToast('הטקסט הועתק ללוח! 📋');
      setTimeout(() => setCopiedPostId(null), 2000);
    } catch (error) {
      console.error('Error copying text:', error);
      addToast('שגיאה בהעתקת הטקסט', 'error');
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-slate-900">לוח שידורים ללקוח</h3>
        <div className="flex gap-2">
          <button onClick={() => onNewPost({ clientId: client.id })} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm">
            <Plus size={16}/> פוסט חדש
          </button>
        </div>
      </div>
      <ContentOnboardingTooltip />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {posts.length > 0 ? posts.map((post, index) => (
          <div 
            key={post.id} 
            data-post-card={index === 0 ? 'first' : undefined}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group flex flex-col"
          >
            <div className="aspect-[4/3] rounded-xl bg-slate-50 mb-4 overflow-hidden relative border border-slate-100">
              {post.mediaUrl ? (
                <img src={post.mediaUrl} className="w-full h-full object-cover" alt={post.content.substring(0, 50)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Image size={24}/>
                </div>
              )}
              <div className="absolute top-2 left-2 flex gap-1">
                {post.platforms.map(p => {
                  const Icon = PLATFORM_ICONS[p];
                  return Icon ? (
                    <div key={p} className="w-6 h-6 bg-white/90 backdrop-blur rounded flex items-center justify-center text-slate-700 shadow-sm border border-slate-100/50">
                      <Icon size={12}/>
                    </div>
                  ) : null;
                })}
              </div>
              {/* Action buttons overlay */}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                {post.mediaUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadMedia(post);
                    }}
                    className="w-3/4 bg-white text-slate-900 px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all"
                  >
                    <Download size={14}/>
                    הורד מדיה
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyText(post);
                  }}
                  className="w-3/4 bg-white text-slate-900 px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all"
                >
                  {copiedPostId === post.id ? (
                    <>
                      <CircleCheckBig size={14} className="text-emerald-600"/>
                      הועתק!
                    </>
                  ) : (
                    <>
                      <Copy size={14}/>
                      העתק טקסט
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="font-medium text-slate-700 text-sm mb-4 line-clamp-3 flex-1">{post.content}</p>
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-bold px-2 py-1 rounded border ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                  {post.status === 'published' ? 'שודר' : 'מתוזמן'}
                </span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => onEditPost(post)} className="w-7 h-7 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded flex items-center justify-center transition-colors">
                    <Edit3 size={14}/>
                  </button>
                  <button onClick={() => onDeletePost(post.id)} className="w-7 h-7 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded flex items-center justify-center transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
              {post.scheduledAt && (
                <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                   <Clock size={10} />
                  {new Date(post.scheduledAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 flex flex-col items-center gap-3">
             <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-2"><Image size={28} /></div>
             <p className="text-sm font-medium text-slate-400">אין תוכן מתוזמן ללקוח זה</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentTab;
