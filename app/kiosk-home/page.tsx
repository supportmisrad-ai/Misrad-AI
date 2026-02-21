'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { Boxes, ClipboardCheck, Clock, Home, MessageSquareText } from 'lucide-react';
import { getActiveShift, punchIn, punchOut } from '@/app/actions/attendance';
import { asObjectLoose as asObject } from '@/lib/shared/unknown';

type WorkspaceApiItem = { id: string; slug: string; name: string };

function getCapacitorIsNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const winObj = asObject(window) ?? {};
  const capObj = asObject(winObj.Capacitor);
  const fn = capObj?.isNativePlatform;
  return typeof fn === 'function' ? Boolean(fn()) : false;
}

function KioskHomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();

  const isNative = getCapacitorIsNativePlatform();

  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');

  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [attendanceNote, setAttendanceNote] = useState('');
  const [activeShift, setActiveShift] = useState<null | { id: string; startTime: string }>(null);
  const [attendanceMessage, setAttendanceMessage] = useState<string>('');
  const [isAttendanceBusy, setIsAttendanceBusy] = useState(false);

  const getLocation = useCallback(async (): Promise<{ lat: number; lng: number; accuracy: number; city?: string }> => {
    if (typeof window === 'undefined') {
      throw new Error('המיקום אינו זמין');
    }
    if (!('geolocation' in navigator)) {
      throw new Error('הדפדפן אינו תומך במיקום GPS');
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 30000,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Reverse geocoding - race with a 3s timeout so it doesn't block
      let city: string | undefined;
      try {
        const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=he`;
        const geocodeRes = await Promise.race([
          fetch(geocodeUrl, { headers: { 'User-Agent': 'MisradAI-Attendance/1.0' } }),
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
        if (geocodeRes.ok) {
          const geocodeData = await geocodeRes.json();
          city = geocodeData?.address?.city || geocodeData?.address?.town || geocodeData?.address?.village || undefined;
        }
      } catch {
        // Silently fail geocoding - not critical
      }

      return { lat, lng, accuracy, city };
    } catch (error: unknown) {
      // Map GPS errors to Hebrew
      const err = error as { code?: number; message?: string };
      if (err?.code === 1) { // PERMISSION_DENIED
        throw new Error('נדרשת הרשאת מיקום. אנא אפשר גישה למיקום בהגדרות הדפדפן.');
      } else if (err?.code === 2) { // POSITION_UNAVAILABLE
        throw new Error('לא ניתן לקבל את המיקום. ודא שה-GPS מופעל.');
      } else if (err?.code === 3) { // TIMEOUT
        throw new Error('פג הזמן בקבלת המיקום. אנא נסה שוב.');
      } else {
        throw new Error('שגיאה בקבלת המיקום. ודא שהמיקום מופעל.');
      }
    }
  }, []);

  const base = useMemo(() => {
    if (!orgSlug) return null;
    return `/w/${encodeURIComponent(orgSlug)}/nexus`;
  }, [orgSlug]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push('/kiosk-login');
      return;
    }

    const fromQuery = searchParams?.get('orgSlug') ?? searchParams?.get('orgId');
    if (fromQuery && String(fromQuery).trim().length > 0) {
      setOrgSlug(String(fromQuery).trim());
      return;
    }

    const load = async () => {
      try {
        const res = await fetch('/api/workspaces', { cache: 'no-store' });
        if (!res.ok) return;
        const data: unknown = await res.json().catch(() => null);
        const dataObj = asObject(data);
        const payload = asObject(dataObj?.data) ?? data;
        const payloadObj = asObject(payload) ?? {};
        const wsRaw = payloadObj.workspaces;
        const ws: WorkspaceApiItem[] = Array.isArray(wsRaw) ? (wsRaw as WorkspaceApiItem[]) : [];
        if (!ws.length) return;
        const pick = ws[0];
        if (pick?.slug) {
          setOrgSlug(String(pick.slug));
          setWorkspaceName(String(pick.name || ''));
          return;
        }
        if (pick?.id) {
          setOrgSlug(String(pick.id));
          setWorkspaceName(String(pick.name || ''));
        }
      } catch {
        return;
      }
    };

    load();
  }, [isLoaded, isSignedIn, router, searchParams]);

  const refreshShift = useCallback(async (effectiveOrgSlug: string) => {
    try {
      const res = await getActiveShift(effectiveOrgSlug);
      setActiveShift(res?.activeShift || null);
    } catch {
      setActiveShift(null);
    }
  }, []);

  useEffect(() => {
    if (!orgSlug) return;
    refreshShift(orgSlug);
  }, [orgSlug, refreshShift]);

  if (!isLoaded) {
    return null;
  }

  const topSafeAreaClass = 'pt-[calc(env(safe-area-inset-top)+1.5rem)] md:pt-[calc(env(safe-area-inset-top)+2.5rem)]';
  const overflowClass = isNative ? 'overflow-hidden h-[100svh]' : 'min-h-screen overflow-x-hidden';
  const activeShiftTime = activeShift?.startTime
    ? new Date(activeShift.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`${overflowClass} ${topSafeAreaClass} bg-slate-950 text-white px-6 pb-6 md:px-10 md:pb-10 overflow-x-hidden`} dir="rtl">
      <div className="max-w-6xl mx-auto h-full">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10 h-full flex flex-col">
          <div className="flex items-start justify-between gap-4 min-w-0">
            <div className="min-w-0">
              <div className="text-3xl md:text-5xl font-black">מצב טאבלט</div>
              <div className="text-white/70 mt-2 text-sm md:text-base truncate max-w-full">{workspaceName ? `סניף: ${workspaceName}` : ''}</div>
              {activeShift ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200">
                  <Clock size={18} /> משמרת פעילה מאז {activeShiftTime}
                </div>
              ) : null}
            </div>

            <button
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-black hover:bg-white/10 transition active:scale-[0.99] shrink-0 min-h-[44px]"
              onClick={() => {
                if (!orgSlug) return;
                router.push(`/w/${encodeURIComponent(orgSlug)}`);
              }}
              disabled={!orgSlug}
            >
              <span className="inline-flex items-center gap-2"><Home size={18} /> דשבורד</span>
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            <button
              className="rounded-3xl bg-emerald-500 text-emerald-950 p-8 md:p-10 text-right hover:bg-emerald-400 active:scale-[0.99] transition flex flex-col justify-between"
              onClick={() => {
                setAttendanceMessage('');
                setAttendanceNote('');
                setIsAttendanceOpen(true);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl md:text-3xl font-black">שעון נוכחות</div>
                <Clock size={40} className="opacity-90" />
              </div>
              <div className="mt-3 text-emerald-950/80 font-black">כניסה / יציאה</div>
            </button>

            <button
              className="rounded-3xl bg-white text-slate-950 p-8 md:p-10 text-right hover:bg-slate-100 active:scale-[0.99] transition flex flex-col justify-between"
              onClick={() => {
                if (!base) return;
                router.push(`${base}/tasks`);
              }}
              disabled={!base}
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl md:text-3xl font-black">משימות</div>
                <ClipboardCheck size={40} className="text-slate-900/80" />
              </div>
              <div className="mt-3 text-slate-600 font-black">רשימת משימות לביצוע</div>
            </button>

            <button
              className="rounded-3xl bg-white/10 border border-white/10 p-8 md:p-10 text-right hover:bg-white/15 active:scale-[0.99] transition flex flex-col justify-between"
              onClick={() => {
                if (!orgSlug) return;
                router.push(`/w/${encodeURIComponent(orgSlug)}/operations/inventory`);
              }}
              disabled={!orgSlug}
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl md:text-3xl font-black">מלאי</div>
                <Boxes size={40} className="opacity-90" />
              </div>
              <div className="mt-3 text-white/70 font-black">ניהול חלקים וציוד</div>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              className="rounded-2xl bg-transparent border border-white/20 px-5 py-4 text-right font-black hover:bg-white/5 active:scale-[0.99] transition"
              onClick={() => router.push('/kiosk-login')}
            >
              צימוד מחדש
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAttendanceOpen && orgSlug ? (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => {
                if (isAttendanceBusy) return;
                setIsAttendanceOpen(false);
              }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6 md:p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl md:text-3xl font-black">שעון נוכחות</div>
                  <div className="mt-2 text-white/70 font-bold text-sm">
                    {activeShift ? `משמרת פעילה מאז ${activeShiftTime}` : 'אין משמרת פעילה'}
                  </div>
                </div>
                <button
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-black hover:bg-white/10 transition"
                  onClick={() => {
                    if (isAttendanceBusy) return;
                    setIsAttendanceOpen(false);
                  }}
                >
                  סגור
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  className="rounded-3xl bg-emerald-500 text-emerald-950 p-8 md:p-10 text-right hover:bg-emerald-400 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (isAttendanceBusy) return; // Prevent double-click

                    setIsAttendanceBusy(true);
                    setAttendanceMessage('');

                    try {
                      // CRITICAL: Get GPS location FIRST before any UI changes
                      const location = await getLocation();

                      // Call API and wait for success
                      const res = await punchIn(orgSlug, attendanceNote, location);

                      // Update UI ONLY after successful API response
                      if (res?.activeShift) {
                        setActiveShift(res.activeShift);
                      }

                      // Refresh shift data
                      await refreshShift(orgSlug);

                      // Show success message ONLY after everything succeeded
                      const inTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                      setAttendanceMessage(res?.alreadyActive ? 'כבר יש משמרת פעילה.' : `נכנסת למשמרת ב-${inTime}. עבודה נעימה!`);
                    } catch (e: unknown) {
                      const msg = String(e instanceof Error ? e.message : e);
                      setAttendanceMessage(msg || 'שגיאה בכניסה למשמרת');
                    } finally {
                      setIsAttendanceBusy(false);
                    }
                  }}
                  disabled={isAttendanceBusy}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-2xl md:text-3xl font-black">כניסה למשמרת</div>
                    <Clock size={40} className="opacity-90" />
                  </div>
                </button>

                <button
                  className="rounded-3xl bg-rose-500 text-rose-950 p-8 md:p-10 text-right hover:bg-rose-400 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (isAttendanceBusy) return; // Prevent double-click

                    setIsAttendanceBusy(true);
                    setAttendanceMessage('');

                    try {
                      // CRITICAL: Get GPS location FIRST before any UI changes
                      const location = await getLocation();

                      // Call API and wait for success
                      const res = await punchOut(orgSlug, attendanceNote, location);

                      // Update UI ONLY after successful API response
                      setActiveShift(null);

                      // Refresh shift data
                      await refreshShift(orgSlug);

                      // Show success message ONLY after everything succeeded
                      const outTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                      setAttendanceMessage(res?.noActiveShift ? 'אין משמרת פעילה לסגירה.' : `יצאת ממשמרת ב-${outTime}. תודה!`);
                    } catch (e: unknown) {
                      const msg = String(e instanceof Error ? e.message : e);
                      setAttendanceMessage(msg || 'שגיאה ביציאה ממשמרת');
                    } finally {
                      setIsAttendanceBusy(false);
                    }
                  }}
                  disabled={isAttendanceBusy}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-2xl md:text-3xl font-black">יציאה ממשמרת</div>
                    <Clock size={40} className="opacity-90" />
                  </div>
                </button>
              </div>

              <div className="mt-5">
                <label className="block text-xs font-black text-white/60">הערה (אופציונלי)</label>
                <div className="mt-2 relative">
                  <MessageSquareText size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    value={attendanceNote}
                    onChange={(e) => setAttendanceNote(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-white/15"
                    placeholder="למשל: יציאה להפסקה קצרה"
                  />
                </div>
              </div>

              {attendanceMessage ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/80">
                  {attendanceMessage}
                </div>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function KioskHomePage() {
  return (
    <Suspense fallback={null}>
      <KioskHomePageInner />
    </Suspense>
  );
}
