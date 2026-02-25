'use client';

import React from 'react';
import { X, Copy, MessageSquare } from 'lucide-react';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface LeadModalTransferDialogProps {
  isCreatingTransfer: boolean;
  transferUrl: string;
  onCreateTransfer: (mode: 'link' | 'marketplace') => void;
  onCopyTransferUrl: () => void;
  onWhatsappTransferUrl: () => void;
  onResetTransferUrl: () => void;
  onClose: () => void;
}

const LeadModalTransferDialog: React.FC<LeadModalTransferDialogProps> = ({
  isCreatingTransfer,
  transferUrl,
  onCreateTransfer,
  onCopyTransferUrl,
  onWhatsappTransferUrl,
  onResetTransferUrl,
  onClose,
}) => {
  useBackButtonClose(true, onClose);
  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={() => (isCreatingTransfer ? null : onClose())}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl border border-slate-200 shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-black text-slate-900">העבר לקבלן</div>
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
            onClick={() => (isCreatingTransfer ? null : onClose())}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-2 text-sm font-bold text-slate-600">בחר איך לשתף את העבודה.</div>

        {!transferUrl ? (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={isCreatingTransfer}
              onClick={() => onCreateTransfer('link')}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black disabled:opacity-50"
            >
              {isCreatingTransfer ? 'יוצר...' : 'שתף באמצעות לינק'}
            </button>
            <button
              type="button"
              disabled={isCreatingTransfer}
              onClick={() => onCreateTransfer('marketplace')}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black disabled:opacity-50"
            >
              {isCreatingTransfer ? 'מפרסם...' : 'פרסם לזירה (ממתין)'}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="text-[11px] font-black text-slate-500">הקישור</div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-xs text-slate-800 break-all">{transferUrl}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCopyTransferUrl}
                className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black"
              >
                <Copy size={16} className="inline-block ml-2" /> העתק קישור
              </button>
              <button
                type="button"
                onClick={onWhatsappTransferUrl}
                className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black"
              >
                <MessageSquare size={16} className="inline-block ml-2" /> שתף בוואטסאפ
              </button>
            </div>

            <button
              type="button"
              onClick={onResetTransferUrl}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-black"
            >
              צור קישור חדש
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadModalTransferDialog;
