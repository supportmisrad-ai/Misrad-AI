'use client';

import React from 'react';
import { Phone, Mail, MessageSquare, CalendarClock, Paperclip, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';

interface LeadModalActionBarProps {
  leadPhone: string;
  leadEmail: string;
  leadId: string;
  isUploadingRecording: boolean;
  canOpenPortal: boolean;
  onOpenTel: () => void;
  onOpenWhatsapp: () => void;
  onOpenEmail: () => void;
  onScheduleMeeting: (leadId: string) => void;
  onOpenTransfer: () => void;
  onOpenClientPortal?: () => void;
  onUploadRecording: (file: File) => void;
}

const LeadModalActionBar: React.FC<LeadModalActionBarProps> = ({
  leadPhone,
  leadEmail,
  leadId,
  isUploadingRecording,
  canOpenPortal,
  onOpenTel,
  onOpenWhatsapp,
  onOpenEmail,
  onScheduleMeeting,
  onOpenTransfer,
  onOpenClientPortal,
  onUploadRecording,
}) => {
  const hasPhone = Boolean(String(leadPhone || '').trim());
  const hasEmail = Boolean(String(leadEmail || '').trim());

  return (
    <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label
            className={`px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black cursor-pointer ${
              isUploadingRecording ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {isUploadingRecording ? (
              <span className="inline-flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full" />
                מעבד...
              </span>
            ) : (
              <>
                <Paperclip size={14} className="inline-block ml-1" /> העלה הקלטה
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.currentTarget.value = '';
                if (!f) return;
                onUploadRecording(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={onOpenTel}
            disabled={!hasPhone}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black disabled:opacity-40"
          >
            <Phone size={14} className="inline-block ml-1" /> חייג
          </button>
          <button
            type="button"
            onClick={onOpenWhatsapp}
            disabled={!hasPhone}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black disabled:opacity-40"
          >
            <MessageSquare size={14} className="inline-block ml-1" /> וואטסאפ
          </button>
          <button
            type="button"
            onClick={onOpenEmail}
            disabled={!hasEmail}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-black disabled:opacity-40"
          >
            <Mail size={14} className="inline-block ml-1" /> מייל
          </button>
          <button
            type="button"
            onClick={() => onScheduleMeeting(leadId)}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-black"
          >
            <CalendarClock size={14} className="inline-block ml-1" /> מעקב
          </button>

          <button
            type="button"
            onClick={onOpenTransfer}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black"
          >
            <Share2 size={14} className="inline-block ml-1" /> העבר לקבלן
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenClientPortal?.()}
          disabled={!canOpenPortal || !onOpenClientPortal}
          className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black disabled:opacity-40"
        >
          פורטל
        </button>
      </div>
    </div>
  );
};

export default LeadModalActionBar;
