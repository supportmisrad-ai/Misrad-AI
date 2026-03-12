'use client';

import { useState } from 'react';
import { Check, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GeoCheckInButton({
  formId,
  className,
  label = 'הגעתי לאתר',
  checkedIn = false,
}: {
  formId: string;
  className?: string;
  label?: string;
  checkedIn?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy || checkedIn) return;
    setBusy(true);

    try {
      if (typeof window === 'undefined') return;
      if (!('geolocation' in navigator)) {
        alert('אין תמיכה במיקום בדפדפן הזה');
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000,
        });
      });

      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) {
        alert('טופס לא נמצא');
        return;
      }

      const latInput = form.querySelector('input[name="lat"]') as HTMLInputElement | null;
      const lngInput = form.querySelector('input[name="lng"]') as HTMLInputElement | null;
      const accInput = form.querySelector('input[name="accuracy"]') as HTMLInputElement | null;

      if (latInput) latInput.value = String(position.coords.latitude);
      if (lngInput) lngInput.value = String(position.coords.longitude);
      if (accInput) accInput.value = String(position.coords.accuracy);

      form.requestSubmit();
    } catch (e: unknown) {
      const msg = String(e instanceof Error ? e.message : e);
      if (msg.toLowerCase().includes('denied')) {
        alert('נדרש אישור גישה למיקום כדי לבצע דיווח הגעה');
      } else {
        alert('לא הצלחנו לקבל מיקום. נסה שוב.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (checkedIn) {
    return (
      <div className={`relative overflow-hidden touch-manipulation inline-flex items-center justify-center gap-2.5 bg-emerald-500 text-white rounded-2xl px-6 py-4 font-black shadow-lg shadow-emerald-500/20 border border-emerald-400/30 ${className || ''}`}>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <Check size={20} strokeWidth={3} className="text-white" />
        הגעה דווחה
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`group relative overflow-hidden touch-manipulation flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-black transition-all duration-300 active:scale-95 disabled:opacity-80
        ${busy 
          ? 'bg-slate-100 text-slate-400 border-slate-200' 
          : 'bg-slate-900 text-white shadow-xl shadow-black/20 hover:bg-black border-white/10'
        } ${className || ''}`}
    >
      {/* Bloom Effect on Busy */}
      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-sky-500/20 blur-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {busy ? (
        <>
          <Loader2 size={20} strokeWidth={3} className="animate-spin" />
          מאמת מיקום…
        </>
      ) : (
        <>
          <MapPin size={20} strokeWidth={2.5} className="group-hover:animate-bounce" />
          {label}
        </>
      )}
    </button>
  );
}
