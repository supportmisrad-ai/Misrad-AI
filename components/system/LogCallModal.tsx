'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Paperclip } from 'lucide-react';

export default function LogCallModal({
  open,
  leadName,
  leadPhone,
  onCloseAction,
  onSaveAction,
  onUploadRecordingAction,
}: {
  open: boolean;
  leadName: string;
  leadPhone: string;
  onCloseAction: () => void;
  onSaveAction: (content: string) => Promise<void> | void;
  onUploadRecordingAction?: (file: File) => Promise<void> | void;
}) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const safeLeadName = useMemo(() => String(leadName || '').trim() || 'ליד', [leadName]);
  const safeLeadPhone = useMemo(() => String(leadPhone || '').trim(), [leadPhone]);

  useEffect(() => {
    if (!open) return;
    setContent('');
    setIsSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseAction();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCloseAction, open]);

  const handleSave = async () => {
    const text = String(content || '').trim();
    if (!text) return;
    setIsSaving(true);
    try {
      await onSaveAction(text);
      onCloseAction();
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!onUploadRecordingAction) return;
    setIsUploading(true);
    try {
      await onUploadRecordingAction(file);
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={onCloseAction}>
      <div
        className="bg-white w-full md:max-w-[640px] rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="text-sm font-black text-slate-900">סיכום שיחה</div>
          <div className="text-xs font-bold text-slate-500 mt-1" dir="ltr">
            {safeLeadName} {safeLeadPhone ? `· ${safeLeadPhone}` : ''}
          </div>
        </div>

        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="מה היה בשיחה? תוצאות, התנגדויות, צעד הבא..."
            className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:outline-none h-40 resize-none"
          />

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onCloseAction}
              disabled={isSaving || isUploading}
              className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-black disabled:opacity-50"
            >
              ביטול
            </button>

            {onUploadRecordingAction ? (
              <label
                className={`px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black cursor-pointer ${
                  isSaving || isUploading ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="inline-block ml-2 animate-spin" /> מעבד...
                  </>
                ) : (
                  <>
                    <Paperclip size={16} className="inline-block ml-2" /> העלה הקלטה
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
                    void handleUpload(f);
                  }}
                />
              </label>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isUploading || !String(content || '').trim()}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-sm font-black disabled:opacity-50"
            >
              שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
