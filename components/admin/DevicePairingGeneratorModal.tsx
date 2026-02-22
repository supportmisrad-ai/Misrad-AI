'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QrCode, RefreshCcw } from 'lucide-react';
import QRCode from 'qrcode';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

export default function DevicePairingGeneratorModal(props: {
  open: boolean;
  onCloseAction: () => void;
  createTokenAction: () => Promise<{ token: string; expiresAt: string } | null>;
  addToastAction: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  useBackButtonClose(props.open, props.onCloseAction);
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const expiresText = expiresAt
    ? new Date(expiresAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : '';

  const generate = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await props.createTokenAction();
      if (!res?.token) {
        props.addToastAction('שגיאה ביצירת טוקן', 'error');
        return;
      }
      setToken(String(res.token));
      setExpiresAt(String(res.expiresAt || ''));
    } catch (e: unknown) {
      props.addToastAction((e instanceof Error ? e.message : String(e)) || 'שגיאה ביצירת טוקן', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [props]);

  useEffect(() => {
    if (!props.open) return;
    setToken('');
    setExpiresAt('');
    setQrDataUrl('');
    generate();
  }, [props.open, generate]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setQrDataUrl('');
        return;
      }
      try {
        const url = await QRCode.toDataURL(token, {
          margin: 2,
          width: 220,
          errorCorrectionLevel: 'M',
        });
        if (cancelled) return;
        setQrDataUrl(url);
      } catch {
        if (cancelled) return;
        setQrDataUrl('');
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AnimatePresence>
      {props.open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={props.onCloseAction}
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 flex flex-col p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-base md:text-lg">צמד מכשיר חדש (QR)</h3>
                <div className="text-xs text-slate-500 mt-1">פתחו בטאבלט: כניסה למסופון → סריקת QR</div>
              </div>
              <button
                onClick={generate}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2"><RefreshCcw size={16} /> חדש</span>
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-center">
              {token ? (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR" width={220} height={220} />
                  ) : (
                    <div className="text-slate-500 font-bold flex items-center gap-2"><QrCode size={18} /> טוען QR…</div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 font-bold flex items-center gap-2"><QrCode size={18} /> טוען QR…</div>
              )}
            </div>

            <div className="mt-4">
              <div className="text-xs font-bold text-slate-500 uppercase">Token</div>
              <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 break-all">{token || '—'}</div>
              {expiresText ? <div className="mt-2 text-xs text-slate-500">בתוקף עד {expiresText}</div> : null}
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={props.onCloseAction}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold"
              >
                סגור
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
