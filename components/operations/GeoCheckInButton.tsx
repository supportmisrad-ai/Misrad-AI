'use client';

import { useState } from 'react';

export default function GeoCheckInButton({
  formId,
  className,
  label = 'הגעתי לאתר',
}: {
  formId: string;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
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

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      {busy ? 'מאמת מיקום…' : label}
    </button>
  );
}
