'use client';

import React, { useState } from 'react';
import { Plus, Image, Edit3, Trash2, Download, Copy, CircleCheckBig } from 'lucide-react';
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
    <div className="bg-white p-10 rounded-[48px] border-[1px] border-slate-100 shadow-xl">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-black">לוח שידורים ללקוח</h3>
        <div className="flex gap-2">
          <button onClick={() => onNewPost({ clientId: client.id })} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2">
            <Plus size={16}/> פוסט חדש
          </button>
        </div>
      </div>
      <ContentOnboardingTooltip />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.length > 0 ? posts.map((post, index) => (
          <div 
            key={post.id} 
            data-post-card={index === 0 ? 'first' : undefined}
            className="bg-slate-50 p-6 rounded-[32px] border border-slate-200 hover:border-blue-600 hover:shadow-xl transition-all group"
          >
            <div className="aspect-square rounded-2xl bg-slate-200 mb-4 overflow-hidden relative">
              {post.mediaUrl ? (
                <img src={post.mediaUrl} className="w-full h-full object-cover" alt={post.content.substring(0, 50)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Image size={32}/>
                </div>
              )}
              <div className="absolute top-3 left-3 flex gap-1">
                {post.platforms.map(p => {
                  const Icon = PLATFORM_ICONS[p];
                  return Icon ? (
                    <div key={p} className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-slate-800 shadow-sm">
                      <Icon size={12}/>
                    </div>
                  ) : null;
                })}
              </div>
              {/* Action buttons overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                {post.mediaUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadMedia(post);
                    }}
                    className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-blue-50 transition-all"
                  >
                    <Download size={16}/>
                    הורד מדיה
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyText(post);
                  }}
                  className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-blue-50 transition-all"
                >
                  {copiedPostId === post.id ? (
                    <>
                      <CircleCheckBig size={16} className="text-green-600"/>
                      הועתק!
                    </>
                  ) : (
                    <>
                      <Copy size={16}/>
                      העתק טקסט
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="font-bold text-slate-700 text-sm italic mb-4 line-clamp-2">"{post.content}"</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {post.status === 'published' ? 'שודר' : 'מתוזמן'}
              </span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => onEditPost(post)} className="p-2 text-slate-400 hover:text-blue-600">
                  <Edit3 size={16}/>
                </button>
                <button onClick={() => onDeletePost(post.id)} className="p-2 text-slate-400 hover:text-red-500">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
            {post.scheduledAt && (
              <div className="mt-3 text-[10px] font-bold text-slate-400">
                מתוזמן ל: {new Date(post.scheduledAt).toLocaleString('he-IL')}
              </div>
            )}
          </div>
        )) : (
          <div className="col-span-full py-24 text-center text-slate-300 font-bold">
            אין תוכן מתוזמן ללקוח זה
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentTab;
