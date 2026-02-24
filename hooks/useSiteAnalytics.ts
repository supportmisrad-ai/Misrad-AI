'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const VISITOR_ID_KEY = 'misrad_visitor_id';
const SESSION_ID_KEY = 'misrad_session_id';
const SESSION_EXPIRY_KEY = 'misrad_session_expiry';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

function getStoredSessionId(): string | null {
  try {
    const id = sessionStorage.getItem(SESSION_ID_KEY);
    const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);
    if (id && expiry && Date.now() < Number(expiry)) {
      return id;
    }
    return null;
  } catch {
    return null;
  }
}

function storeSessionId(id: string): void {
  try {
    sessionStorage.setItem(SESSION_ID_KEY, id);
    sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS));
  } catch {
    // ignore
  }
}

function refreshSessionExpiry(): void {
  try {
    sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS));
  } catch {
    // ignore
  }
}

function detectDevice(): { device_type: string; browser: string; os: string } {
  const ua = navigator.userAgent;
  let device_type = 'desktop';
  if (/Mobi|Android/i.test(ua)) device_type = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) device_type = 'tablet';

  let browser = 'other';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  let os = 'other';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';

  return { device_type, browser, os };
}

function getUtmParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

async function sendTrack(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sendBeaconTrack(payload: Record<string, unknown>): void {
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/track', blob);
  } catch {
    // fallback to fetch
    sendTrack(payload).catch(() => undefined);
  }
}

export function useSiteAnalytics() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);
  const pageviewIdRef = useRef<string | null>(null);
  const pageEnteredRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const visitorIdRef = useRef<string>('');
  const initRef = useRef(false);

  const flushPageView = useCallback(() => {
    if (!pageviewIdRef.current || !sessionIdRef.current) return;
    const timeOnPage = Date.now() - pageEnteredRef.current;
    sendBeaconTrack({
      type: 'pageview_update',
      visitor_id: visitorIdRef.current,
      session_id: sessionIdRef.current,
      pageview_id: pageviewIdRef.current,
      time_on_page_ms: timeOnPage,
      max_scroll_pct: maxScrollRef.current,
    });
    pageviewIdRef.current = null;
  }, []);

  // Init session + first pageview
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const visitorId = getVisitorId();
    visitorIdRef.current = visitorId;

    (async () => {
      let sid = getStoredSessionId();
      if (!sid) {
        const device = detectDevice();
        const utm = getUtmParams();
        const result = await sendTrack({
          type: 'session',
          visitor_id: visitorId,
          referrer: document.referrer || undefined,
          landing_page: pathname || window.location.pathname,
          ...device,
          ...utm,
        });
        sid = (result?.session_id as string) || null;
        if (sid) storeSessionId(sid);
      }
      if (!sid) return;
      sessionIdRef.current = sid;
      refreshSessionExpiry();

      // Track first pageview
      const pvResult = await sendTrack({
        type: 'pageview',
        visitor_id: visitorId,
        session_id: sid,
        path: pathname || window.location.pathname,
        title: document.title,
        referrer_page: document.referrer || undefined,
      });
      pageviewIdRef.current = (pvResult?.pageview_id as string) || null;
      pageEnteredRef.current = Date.now();
      maxScrollRef.current = 0;
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track subsequent page changes
  useEffect(() => {
    if (!initRef.current || !sessionIdRef.current) return;

    // Flush previous page
    flushPageView();
    refreshSessionExpiry();

    // Track new page
    (async () => {
      const pvResult = await sendTrack({
        type: 'pageview',
        visitor_id: visitorIdRef.current,
        session_id: sessionIdRef.current,
        path: pathname || window.location.pathname,
        title: document.title,
      });
      pageviewIdRef.current = (pvResult?.pageview_id as string) || null;
      pageEnteredRef.current = Date.now();
      maxScrollRef.current = 0;
    })();
  }, [pathname, flushPageView]);

  // Track scroll depth
  useEffect(() => {
    const onScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        maxScrollRef.current = 100;
        return;
      }
      const pct = Math.min(100, Math.round((window.scrollY / scrollHeight) * 100));
      if (pct > maxScrollRef.current) {
        maxScrollRef.current = pct;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Flush on page unload
  useEffect(() => {
    const onUnload = () => flushPageView();
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [flushPageView]);

  // Track custom event
  const trackEvent = useCallback((eventType: string, eventData?: Record<string, unknown>) => {
    if (!sessionIdRef.current) return;
    sendTrack({
      type: 'event',
      visitor_id: visitorIdRef.current,
      session_id: sessionIdRef.current,
      event_type: eventType,
      event_data: eventData,
      page_path: pathname || window.location.pathname,
    }).catch(() => undefined);
  }, [pathname]);

  // Track signup
  const trackSignup = useCallback((userId: string) => {
    if (!sessionIdRef.current) return;
    sendTrack({
      type: 'signup',
      visitor_id: visitorIdRef.current,
      session_id: sessionIdRef.current,
      signup_user_id: userId,
    }).catch(() => undefined);
  }, []);

  return { trackEvent, trackSignup };
}
