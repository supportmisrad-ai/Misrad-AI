'use client';

import React from 'react';
import { Copy, MessageSquare } from 'lucide-react';

interface ShareRequest {
  token: string;
  interestedName: string;
  interestedPhone: string;
  interestedAt: string;
  approvedAt: string | null;
}

interface LeadModalShareViewProps {
  sharePriceInput: string;
  onSharePriceChange: (val: string) => void;
  shareDescription: string;
  onShareDescriptionChange: (val: string) => void;
  shareUrl: string;
  isCreatingShare: boolean;
  onCreateShareLink: () => void;
  onCopyShareLink: () => void;
  onWhatsappShareLink: () => void;
  isLoadingRequests: boolean;
  shareRequests: ShareRequest[];
  onRefreshRequests: () => void;
  approvingToken: string | null;
  onApproveDisclosure: (token: string) => void;
}

const LeadModalShareView: React.FC<LeadModalShareViewProps> = ({
  sharePriceInput,
  onSharePriceChange,
  shareDescription,
  onShareDescriptionChange,
  shareUrl,
  isCreatingShare,
  onCreateShareLink,
  onCopyShareLink,
  onWhatsappShareLink,
  isLoadingRequests,
  shareRequests,
  onRefreshRequests,
  approvingToken,
  onApproveDisclosure,
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-4">
            <div className="text-lg font-black text-slate-900">העבר עבודה / שתף</div>
            <div className="text-sm font-bold text-slate-500 mt-1">
              צור קישור ציבורי לקבלן אחר. אל תכתוב פרטים רגישים בתיאור.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-4">
            <div className="space-y-1">
              <div className="text-[11px] font-black text-slate-500">דמי רצינות / מחיר המכירה (אופציונלי)</div>
              <input
                type="number"
                value={sharePriceInput}
                onChange={(e) => onSharePriceChange(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
              />
              <div className="text-xs font-bold text-slate-400">ריק או 0 = חינם</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-black text-slate-500">תיאור ציבורי</div>
              <textarea
                value={shareDescription}
                onChange={(e) => onShareDescriptionChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none h-32 resize-none"
                placeholder="כתוב תיאור קצר לעבודה..."
              />
            </div>

            {shareUrl ? (
              <div className="space-y-2">
                <div className="text-[11px] font-black text-slate-500">הקישור</div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-xs text-slate-800 break-all">{shareUrl}</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onCopyShareLink}
                    className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black"
                  >
                    <Copy size={16} className="inline-block ml-2" /> העתק קישור
                  </button>
                  <button
                    type="button"
                    onClick={onWhatsappShareLink}
                    className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black"
                  >
                    <MessageSquare size={16} className="inline-block ml-2" /> שתף בוואטסאפ
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onCreateShareLink}
                disabled={isCreatingShare}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black disabled:opacity-50"
              >
                {isCreatingShare ? 'יוצר קישור...' : 'צור קישור שיתוף'}
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-900">בקשות שהתקבלו</div>
              <button
                type="button"
                onClick={onRefreshRequests}
                disabled={isLoadingRequests}
                className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black disabled:opacity-40"
              >
                רענן
              </button>
            </div>

            {isLoadingRequests ? (
              <div className="mt-3 text-sm font-bold text-slate-500">טוען...</div>
            ) : shareRequests.length === 0 ? (
              <div className="mt-3 text-sm font-bold text-slate-500">עדיין לא התקבלו בקשות.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {shareRequests.map((r) => {
                  const approved = Boolean(r.approvedAt);
                  const dt = r.interestedAt ? new Date(r.interestedAt) : null;

                  return (
                    <div key={r.token} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate">{String(r.interestedName || '—')}</div>
                          <div className="mt-1 text-sm font-bold text-slate-700" dir="ltr">
                            {String(r.interestedPhone || '').trim() ? String(r.interestedPhone) : '—'}
                          </div>
                          <div className="mt-1 text-[11px] font-bold text-slate-500">
                            {dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString('he-IL') : '—'}
                          </div>
                        </div>

                        <div className="shrink-0 text-right space-y-2">
                          <div
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black border ${
                              approved ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {approved ? 'אושר' : 'ממתין'}
                          </div>

                          {!approved ? (
                            <button
                              type="button"
                              onClick={() => onApproveDisclosure(String(r.token))}
                              disabled={Boolean(approvingToken)}
                              className="w-full px-3 py-2 rounded-2xl bg-slate-900 text-white text-xs font-black disabled:opacity-50"
                            >
                              {approvingToken === String(r.token) ? 'מאשר...' : 'אשר חשיפה'}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {String(r.interestedPhone || '').trim() ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              const p = String(r.interestedPhone || '').trim();
                              if (!p) return;
                              window.location.href = `tel:${p}`;
                            }}
                            className="w-full px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black"
                          >
                            חייג למתעניין
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadModalShareView;
