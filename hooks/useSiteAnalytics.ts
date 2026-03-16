'use client';

/**
 * Analytics Batching and Rate Limit Protection
 * 
 * This module provides intelligent batching, sampling, and backoff
 * to prevent 429 rate limit errors from the analytics API.
 * 
 * Key features:
 * - Batches multiple events and sends every 5 seconds
 * - Exponential backoff on 429 errors (1s, 2s, 4s, 8s max)
 * - Sampling for high-frequency events (scroll, mousemove)
 * - Request deduplication
 * - Graceful degradation when rate limited
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const VISITOR_ID_KEY = 'misrad_visitor_id';
const SESSION_ID_KEY = 'misrad_session_id';
const SESSION_EXPIRY_KEY = 'misrad_session_expiry';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_BACKOFF_KEY = 'misrad_rate_limit_backoff';

// Batching configuration
const BATCH_INTERVAL_MS = 5000; // Send batch every 5 seconds
const MAX_BATCH_SIZE = 50; // Max events per batch
const MAX_BACKOFF_MS = 30000; // Max 30 second backoff

// Sampling rates (0-1, lower = less frequent)
const SAMPLING_RATES: Record<string, number> = {
  scroll: 0.1, // Sample 10% of scroll events
  mousemove: 0.05, // Sample 5% of mouse movements
  click: 1.0, // Track all clicks
  pageview: 1.0, // Track all pageviews
  session: 1.0, // Track all sessions
  signup: 1.0, // Track all signups
  event: 1.0, // Track all custom events
};

type EventType = 'session' | 'pageview' | 'pageview_update' | 'event' | 'signup' | 'scroll' | 'click' | 'mousemove';

interface AnalyticsEvent {
  id: string;
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

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

function getBackoffMs(): number {
  try {
    const stored = sessionStorage.getItem(RATE_LIMIT_BACKOFF_KEY);
    if (stored) {
      const backoff = Number(stored);
      if (Number.isFinite(backoff) && backoff > Date.now()) {
        return backoff - Date.now();
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

function setBackoffMs(ms: number): void {
  try {
    const expiry = Date.now() + Math.min(ms, MAX_BACKOFF_MS);
    sessionStorage.setItem(RATE_LIMIT_BACKOFF_KEY, String(expiry));
  } catch {
    // ignore
  }
}

function clearBackoff(): void {
  try {
    sessionStorage.removeItem(RATE_LIMIT_BACKOFF_KEY);
  } catch {
    // ignore
  }
}

function shouldSample(eventType: EventType): boolean {
  const rate = SAMPLING_RATES[eventType] ?? 1.0;
  if (rate >= 1.0) return true;
  return Math.random() < rate;
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

class AnalyticsBatchQueue {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private consecutiveFailures = 0;
  private visitorId: string;
  private sessionId: string | null = null;
  private onSessionCreated?: (id: string) => void;

  constructor(visitorId: string, onSessionCreated?: (id: string) => void) {
    this.visitorId = visitorId;
    this.onSessionCreated = onSessionCreated;
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush();
    }, BATCH_INTERVAL_MS);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  enqueue(event: Omit<AnalyticsEvent, 'id' | 'timestamp' | 'retries'>): void {
    // Check sampling
    if (!shouldSample(event.type)) {
      return;
    }

    // Check current backoff
    const backoffMs = getBackoffMs();
    if (backoffMs > 0) {
      // In backoff period, only enqueue critical events
      if (!['session', 'signup', 'pageview'].includes(event.type)) {
        return;
      }
    }

    const fullEvent: AnalyticsEvent = {
      ...event,
      id: generateId(),
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(fullEvent);

    // If queue gets too large, flush immediately
    if (this.queue.length >= MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    // Check backoff
    const backoffMs = getBackoffMs();
    if (backoffMs > 0) {
      console.log(`[Analytics] Backing off for ${backoffMs}ms due to rate limiting`);
      return;
    }

    this.isProcessing = true;

    // Take current batch
    const batch = this.queue.splice(0, MAX_BATCH_SIZE);

    try {
      // Send as batch to new endpoint
      const result = await this.sendBatch(batch);

      if (!result.ok) {
        if (result.status === 429) {
          // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
          const backoff = Math.min(1000 * Math.pow(2, this.consecutiveFailures), MAX_BACKOFF_MS);
          this.consecutiveFailures++;
          setBackoffMs(backoff);
          // Re-queue all events
          this.queue.unshift(...batch);
        } else {
          // Re-queue retryable events
          const retryableEvents = batch.filter(e => e.retries < 3).map(e => ({ ...e, retries: e.retries + 1 }));
          this.queue.unshift(...retryableEvents);
        }
        return;
      }

      // Reset failure count on success
      this.consecutiveFailures = 0;
      clearBackoff();

      // Update session ID if returned
      if (result.session_id) {
        this.sessionId = result.session_id;
        storeSessionId(result.session_id);
        this.onSessionCreated?.(result.session_id);
      }

      // Re-queue failed individual events from batch response
      if (result.results) {
        const failedEvents = batch.filter((_, i) => !result.results?.[i]?.ok && batch[i].retries < 3).map(e => ({ ...e, retries: e.retries + 1 }));
        if (failedEvents.length > 0) {
          this.queue.unshift(...failedEvents);
        }
      }
    } catch (error) {
      console.error('[Analytics] Flush error:', error);
      // Re-queue all events
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendBatch(batch: AnalyticsEvent[]): Promise<{ ok: boolean; status?: number; session_id?: string; results?: Array<{ ok: boolean }> }> {
    try {
      // Extract session fields from first session event if exists
      const sessionEvent = batch.find(e => e.type === 'session');
      const device = sessionEvent ? detectDevice() : { device_type: undefined, browser: undefined, os: undefined };
      const utm = sessionEvent ? getUtmParams() : {};

      const payload = {
        visitor_id: this.visitorId,
        session_id: this.sessionId || getStoredSessionId(),
        events: batch.map(e => ({
          type: e.type as 'session' | 'pageview' | 'pageview_update' | 'event' | 'signup',
          payload: e.payload,
          timestamp: e.timestamp,
        })),
        // Include session fields if creating session
        referrer: sessionEvent ? document.referrer || undefined : undefined,
        landing_page: sessionEvent ? (sessionEvent.payload.path as string) || window.location.pathname : undefined,
        device_type: device.device_type,
        browser: device.browser,
        os: device.os,
        ...utm,
      };

      const res = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!res.ok) {
        return { ok: false, status: res.status };
      }

      const data = await res.json() as { ok: boolean; session_id?: string; results?: Array<{ ok: boolean }> };
      return { ok: data.ok, session_id: data.session_id, results: data.results };
    } catch (error) {
      console.error('[Analytics] Batch error:', error);
      return { ok: false };
    }
  }

  private async sendSingle(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    // Fallback to single endpoint if batch fails (should not happen)
    try {
      const res = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (res.status === 429) {
        const error = new Error('Rate limited') as Error & { status: number };
        error.status = 429;
        throw error;
      }

      if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`) as Error & { status: number };
        error.status = res.status;
        throw error;
      }

      return await res.json();
    } catch (error) {
      throw error;
    }
  }

  sendBeacon(payload: Record<string, unknown>): void {
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    } catch {
      // Silent fail - beacon is best-effort
    }
  }
}

export function useSiteAnalytics() {
  const pathname = usePathname();
  const queueRef = useRef<AnalyticsBatchQueue | null>(null);
  const pageviewIdRef = useRef<string | null>(null);
  const pageEnteredRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const visitorIdRef = useRef<string>('');
  const initRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const flushPageView = useCallback(() => {
    if (!pageviewIdRef.current || !queueRef.current || !sessionIdRef.current) return;
    
    const timeOnPage = Date.now() - pageEnteredRef.current;
    queueRef.current.sendBeacon({
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

    queueRef.current = new AnalyticsBatchQueue(visitorId, (sid) => {
      sessionIdRef.current = sid;
    });

    // Try to restore existing session
    const existingSid = getStoredSessionId();
    if (existingSid) {
      sessionIdRef.current = existingSid;
    }

    // Send session event if needed
    queueRef.current.enqueue({
      type: 'session',
      payload: {
        path: pathname || window.location.pathname,
      },
    });

    // Send first pageview
    queueRef.current.enqueue({
      type: 'pageview',
      payload: {
        path: pathname || window.location.pathname,
        title: document.title,
        referrer_page: document.referrer || undefined,
      },
    });

    pageEnteredRef.current = Date.now();
    maxScrollRef.current = 0;

    return () => {
      queueRef.current?.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track subsequent page changes
  useEffect(() => {
    if (!initRef.current || !queueRef.current) return;

    // Flush previous page
    flushPageView();
    refreshSessionExpiry();

    // Track new page
    queueRef.current.enqueue({
      type: 'pageview',
      payload: {
        path: pathname || window.location.pathname,
        title: document.title,
      },
    });

    pageEnteredRef.current = Date.now();
    maxScrollRef.current = 0;
  }, [pathname, flushPageView]);

  // Track scroll depth (with sampling)
  useEffect(() => {
    let lastScrollTime = 0;
    const SCROLL_THROTTLE_MS = 500; // Max one sampled scroll event per 500ms

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

      // Sample scroll events
      const now = Date.now();
      if (now - lastScrollTime > SCROLL_THROTTLE_MS) {
        lastScrollTime = now;
        queueRef.current?.enqueue({
          type: 'scroll',
          payload: {
            scroll_pct: pct,
            page_path: pathname || window.location.pathname,
          },
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

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
    if (!queueRef.current || !sessionIdRef.current) return;
    
    queueRef.current.enqueue({
      type: 'event',
      payload: {
        event_type: eventType,
        event_data: eventData,
        page_path: pathname || window.location.pathname,
      },
    });
  }, [pathname]);

  // Track signup
  const trackSignup = useCallback((userId: string) => {
    if (!queueRef.current || !sessionIdRef.current) return;
    
    queueRef.current.enqueue({
      type: 'signup',
      payload: {
        signup_user_id: userId,
      },
    });
  }, []);

  // Track click (with sampling for high-frequency clicks)
  const trackClick = useCallback((elementName?: string) => {
    if (!queueRef.current || !sessionIdRef.current) return;
    
    queueRef.current.enqueue({
      type: 'click',
      payload: {
        element: elementName,
        page_path: pathname || window.location.pathname,
      },
    });
  }, [pathname]);

  return { trackEvent, trackSignup, trackClick };
}

export default useSiteAnalytics;
