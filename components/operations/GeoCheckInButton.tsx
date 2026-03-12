'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

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
      <div className={`touch-manipulation inline-flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 rounded-2xl px-4 py-3 font-black ${className || ''}`}>
        <Check size={18} className="text-emerald-600" />
        הגעה דווחה
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} className={`touch-manipulation ${className || ''}`}>
      {busy ? 'מאמת מיקום…' : label}
    </button>
  );
}
