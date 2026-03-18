'use client';

import React from 'react';
import { Star, Clock, Link as LinkIcon, CircleCheck, Facebook, Instagram, Linkedin, Video, Globe, MessageCircle, Twitter, Share2, Pin, MessageSquare, Pencil } from 'lucide-react';
import { getClientStatusLabel, getClientStatusColor } from '@/lib/status-labels';
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
    <section className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 md:gap-8">
      <div className="relative group shrink-0">
        {avatarSrc ? (
          <img 
            src={avatarSrc} 
            className="w-20 h-20 md:w-28 md:h-28 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 object-cover" 
            alt={activeClient.companyName}
          />
        ) : (
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-indigo-700 font-bold text-2xl md:text-3xl">
            {initials}
          </div>
        )}
        <button 
          onClick={onTogglePin}
          className={`absolute -top-2 -right-2 p-1.5 rounded-lg shadow-sm border border-slate-100 transition-all transform hover:scale-105 ${
            isPinned ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-400 opacity-0 group-hover:opacity-100'
          }`}
          title={isPinned ? 'הסר מגישה מהירה' : 'הצמד לגישה מהירה'}
        >
          <Star size={14} fill={isPinned ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="flex-1 text-center md:text-right">
        <h2 className="text-xl md:text-3xl font-bold text-slate-900 mb-1">{activeClient.companyName}</h2>
        <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-2">
          <span className="bg-slate-50 text-slate-700 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border border-slate-100">
            <Clock size={12} /> {activeClient.postingRhythm}
          </span>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
            {activeClient.activePlatforms.map(p => {
              const Icon = PLATFORM_ICONS[p];
              return <Icon key={p} size={10} className="text-slate-500" />;
            })}
            <span className="text-[10px] font-bold text-slate-500 mr-1">
              {activeClient.activePlatforms.length} רשתות
            </span>
          </div>
          <span className={`px-2 py-1 rounded-lg font-bold text-[10px] border ${getClientStatusColor(activeClient.status).replace('bg-', 'bg-').replace('text-', 'text-').replace('100', '50')}`}>
            {getClientStatusLabel(activeClient.status)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
        <div className="flex gap-2">
          <button 
            onClick={onPaymentClick} 
            className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors border border-emerald-100"
          >
            גבייה
          </button>
          <button 
            onClick={onNewPost} 
            className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors"
          >
            + פוסט חדש
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onEditClient}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <Pencil size={12} /> עריכת פרטי לקוח
          </button>

          <button 
            onClick={onCopyLink} 
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all border ${
              isCopyingLink ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
            }`}
          >
            {isCopyingLink ? (
              <>
                <CircleCheck size={12}/> הועתק!
              </>
            ) : (
              <>
                <LinkIcon size={12}/> לינק לפורטל
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

