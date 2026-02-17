'use client';

import React from 'react';
import { Star, Clock, Link as LinkIcon, CircleCheck, Facebook, Instagram, Linkedin, Video, Globe, MessageCircle, Twitter, Share2, Pin, MessageSquare, Pencil } from 'lucide-react';
import { Client, SocialPlatform } from '@/types/social';

const PLATFORM_ICONS: Record<SocialPlatform, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Video,
  twitter: Twitter,
  google: Globe,
  whatsapp: MessageCircle,
  threads: Share2,
  youtube: Video,
  pinterest: Pin,
  portal: MessageSquare
};

interface ClientWorkspaceHeaderProps {
  activeClient: Client;
  isPinned: boolean;
  isCopyingLink: boolean;
  onTogglePin: () => void;
  onCopyLink: () => void;
  onPaymentClick: () => void;
  onEditClient: () => void;
  onNewPost: () => void;
}

export function ClientWorkspaceHeader({
  activeClient,
  isPinned,
  isCopyingLink,
  onTogglePin,
  onCopyLink,
  onPaymentClick,
  onEditClient,
  onNewPost
}: ClientWorkspaceHeaderProps) {

  const getInitials = (name?: string) => {
    const n = String(name || '').trim();
    if (!n) return '?';
    return n
      .split(' ')
      .filter(Boolean)
      .map((p) => p.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const rawAvatar = String(activeClient.avatar || '').trim();
  const avatarSrc = rawAvatar && rawAvatar !== '/icons/misrad-icon.svg' ? rawAvatar : '';
  const initials = getInitials(activeClient.companyName || activeClient.name);

  return (
    <section className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-xl flex flex-col md:flex-row items-center gap-6 md:gap-10">
      <div className="relative group">
        {avatarSrc ? (
          <img 
            src={avatarSrc} 
            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[40px] shadow-2xl border-2 md:border-4 border-white object-cover" 
            alt={activeClient.companyName}
          />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[40px] shadow-2xl border-2 md:border-4 border-white bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-3xl md:text-4xl">
            {initials}
          </div>
        )}
        <button 
          onClick={onTogglePin}
          className={`absolute -top-2 -right-2 p-2 rounded-xl shadow-lg border-2 border-white transition-all transform hover:scale-110 ${
            isPinned ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100'
          }`}
          title={isPinned ? 'הסר מגישה מהירה' : 'הצמד לגישה מהירה'}
        >
          <Star size={16} fill={isPinned ? "white" : "none"} />
        </button>
      </div>
      <div className="flex-1 text-center md:text-right">
        <h2 className="text-2xl md:text-4xl font-black text-slate-800">{activeClient.companyName}</h2>
        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4 mt-3 md:mt-4">
          <span className="bg-slate-50 text-slate-900 px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black flex items-center gap-2">
            <Clock size={14} /> {activeClient.postingRhythm}
          </span>
          <div className="flex items-center gap-2 bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl">
            {activeClient.activePlatforms.map(p => {
              const Icon = PLATFORM_ICONS[p];
              return <Icon key={p} size={12} className="text-slate-400" />;
            })}
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 mr-1">
              {activeClient.activePlatforms.length} רשתות
            </span>
          </div>
          <span className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase ${
            activeClient.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {activeClient.status === 'Active' ? 'פעיל' : 'בפיגור'}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3 w-full md:w-auto">
        <div className="flex gap-2 md:gap-4">
          <button 
            onClick={onPaymentClick} 
            className="flex-1 bg-green-50 text-green-600 px-4 md:px-8 py-3 md:py-5 rounded-xl md:rounded-[24px] font-black text-sm shadow-lg"
          >
            גבייה
          </button>
          <button 
            onClick={onNewPost} 
            className="flex-[2] bg-slate-900 text-white px-4 md:px-10 py-3 md:py-5 rounded-xl md:rounded-[24px] font-black text-sm shadow-2xl"
          >
            + פוסט חדש
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onEditClient}
            className="flex-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs transition-all border-2 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
          >
            <Pencil size={14} /> עריכת פרטי לקוח
          </button>

          <button 
            onClick={onCopyLink} 
            className={`flex-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs transition-all border-2 ${
              isCopyingLink ? 'bg-green-500 text-white border-green-500' : 'bg-white text-blue-600 border-blue-50'
            }`}
          >
            {isCopyingLink ? (
              <>
                <CircleCheck size={14}/> הועתק!
              </>
            ) : (
              <>
                <LinkIcon size={14}/> לינק לפורטל
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

