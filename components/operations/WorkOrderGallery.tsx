'use client';

import { useCallback, useEffect, useState } from 'react';

type Attachment = {
  id: string;
  url: string;
  mimeType: string | null;
  createdAt: string;
};

export default function WorkOrderGallery({ attachments }: { attachments: Attachment[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = attachments.filter((a) => String(a.mimeType || '').startsWith('image/'));
  const files = attachments.filter((a) => !String(a.mimeType || '').startsWith('image/'));

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goNext();
      if (e.key === 'ArrowRight') goPrev();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  if (!attachments.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-black text-slate-700">קבצים ותמונות</div>
        <div className="mt-2 text-sm text-slate-500">אין עדיין קבצים</div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-black text-slate-700 mb-3">
          קבצים ותמונות
          <span className="text-slate-400 font-bold mr-1">({attachments.length})</span>
        </div>

        {/* Image grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:border-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {/* Non-image files */}
        {files.length > 0 ? (
          <div className="space-y-1.5">
            {files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                  {getFileIcon(f.mimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-700 truncate">{formatMimeLabel(f.mimeType)}</div>
                  <div className="text-[10px] text-slate-400">{new Date(f.createdAt).toLocaleString('he-IL')}</div>
                </div>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {/* Lightbox overlay */}
      {lightboxIndex !== null && images[lightboxIndex] ? (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 right-4 z-10 bg-white/10 text-white text-xs font-bold rounded-full px-3 py-1.5">
            {lightboxIndex + 1} / {images.length}
          </div>

          {/* Navigation */}
          {lightboxIndex > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          ) : null}
          {lightboxIndex < images.length - 1 ? (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          ) : null}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightboxIndex].url}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Download button */}
          <a
            href={images[lightboxIndex].url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full px-4 py-2 flex items-center gap-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            פתח מקור
          </a>

          {/* Thumbnail strip */}
          {images.length > 1 ? (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 bg-black/30 rounded-xl p-1.5 max-w-[80vw] overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                  className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    idx === lightboxIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function getFileIcon(mimeType: string | null): string {
  const m = String(mimeType || '').toLowerCase();
  if (m.includes('pdf')) return 'PDF';
  if (m.includes('video')) return 'VID';
  if (m.includes('word') || m.includes('doc')) return 'DOC';
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv')) return 'XLS';
  return 'FILE';
}

function formatMimeLabel(mimeType: string | null): string {
  const m = String(mimeType || '').toLowerCase();
  if (m.includes('pdf')) return 'מסמך PDF';
  if (m.includes('video')) return 'קובץ וידאו';
  if (m.includes('word') || m.includes('doc')) return 'מסמך Word';
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv')) return 'גיליון נתונים';
  return 'קובץ';
}
