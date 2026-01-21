'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';

export default function VisionIdentifyFillSearch({
  formId,
  inputName,
  orgSlug,
  token,
  className,
}: {
  formId: string;
  inputName: string;
  orgSlug?: string;
  token?: string;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPickFile(file: File) {
    if (busy) return;
    setBusy(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onerror = () => reject(new Error('לא הצלחנו לקרוא את הקובץ'));
        r.onload = () => resolve(String(r.result || ''));
        r.readAsDataURL(file);
      });

      const base64 = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : '';
      const mimeType = file.type || 'image/jpeg';

      const res = await fetch('/api/ai/vision/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(orgSlug ? { 'x-org-id': String(orgSlug) } : {}),
        },
        body: JSON.stringify({
          token: token ? String(token) : undefined,
          imageBase64: base64,
          mimeType,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        throw new Error(String(json?.error || 'שגיאה בזיהוי תמונה'));
      }

      const name = json?.name ? String(json.name).trim() : '';
      if (!name) {
        throw new Error('זיהוי נכשל (שם חלק ריק)');
      }

      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) {
        throw new Error('טופס לא נמצא');
      }

      const input = form.querySelector(`[name="${CSS.escape(inputName)}"]`) as HTMLInputElement | null;
      if (!input) {
        throw new Error('שדה חיפוש לא נמצא');
      }

      input.value = name;
      form.requestSubmit();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) {
            onPickFile(f).catch((err: any) => {
              alert(String(err?.message || err || 'שגיאה'));
            });
          }
        }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        className={
          className ||
          'inline-flex items-center justify-center rounded-2xl px-3 py-2 text-xs font-black bg-white/80 border border-slate-200 hover:bg-white transition-colors disabled:opacity-60'
        }
        aria-label="חיפוש לפי תמונה"
        title="חיפוש לפי תמונה"
      >
        <Camera size={16} className="text-slate-900" />
      </button>
    </>
  );
}
