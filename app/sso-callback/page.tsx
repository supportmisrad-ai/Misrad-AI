'use client';

import { AuthenticateWithRedirectCallback, useAuth } from '@clerk/nextjs';
import { useEffect, useState, useRef, useCallback } from 'react';

export const dynamic = 'force-dynamic';

const SSO_ATTEMPT_KEY = 'sso_callback_attempt';
const MAX_SSO_ATTEMPTS = 5;

type ClerkApiLog = {
  ts: string;
  method: string;
  url: string;
  status: number;
  body: string;
};

function getSsoAttemptCount(): number {
  try {
    return Number(sessionStorage.getItem(SSO_ATTEMPT_KEY) || '0');
  } catch {
    return 0;
  }
}

function incrementSsoAttempt(): number {
  const count = getSsoAttemptCount() + 1;
  try {
    sessionStorage.setItem(SSO_ATTEMPT_KEY, String(count));
  } catch {
    // ignore
  }
  return count;
}

function clearSsoAttempts(): void {
  try {
    sessionStorage.removeItem(SSO_ATTEMPT_KEY);
  } catch {
    // ignore
  }
}

export default function SsoCallbackPage() {
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<ClerkApiLog[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const loopDetected = useRef(false);
  const { isSignedIn, isLoaded, userId } = useAuth();

  const addLog = useCallback((log: ClerkApiLog) => {
    setApiLogs(prev => [...prev.slice(-19), log]);
  }, []);

  // Log initial page state
  useEffect(() => {
    const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
    const info = [
      `URL: ${window.location.href}`,
      `Hash: ${window.location.hash ? 'YES (' + window.location.hash.length + ' chars)' : 'NONE'}`,
      `Search: ${window.location.search || 'NONE'}`,
      `Cookies: ${cookies.join(', ') || 'NONE'}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');
    setDebugInfo(info);
    console.log('[SSO-Callback] Page loaded:', info);
  }, []);

  // Monitor auth state changes
  useEffect(() => {
    if (!isLoaded) return;
    console.log('[SSO-Callback] Auth state:', { isSignedIn, userId, isLoaded });
    if (isSignedIn && userId) {
      console.log('[SSO-Callback] ✅ Auth SUCCESS - userId:', userId);
      clearSsoAttempts();
    }
  }, [isSignedIn, userId, isLoaded]);

  // Detect redirect loops: if we've been here too many times, stop and show error
  useEffect(() => {
    const attempts = incrementSsoAttempt();
    console.log('[SSO-Callback] Attempt #', attempts);
    if (attempts > MAX_SSO_ATTEMPTS) {
      loopDetected.current = true;
      clearSsoAttempts();
      setCallbackError(
        'ההרשמה נכשלה מספר פעמים ברצף. ייתכן שהרשמות חדשות חסומות. נא ליצור קשר עם התמיכה או לנסות שוב מאוחר יותר.'
      );
      return;
    }

    // Clear attempts after successful navigation (10s grace period)
    const clearTimer = setTimeout(() => {
      clearSsoAttempts();
    }, 10000);

    return () => clearTimeout(clearTimer);
  }, []);

  // Safety valve: if SSO callback is stuck for 15s, show error instead of silent redirect
  useEffect(() => {
    if (loopDetected.current) return;

    const timer = setTimeout(() => {
      clearSsoAttempts();
      const cookiesNow = document.cookie.split(';').map(c => c.trim()).filter(Boolean);
      setCallbackError(
        `תהליך האימות לקח יותר מדי זמן. Cookies: ${cookiesNow.length}. isSignedIn: ${isSignedIn}. userId: ${userId || 'none'}`
      );
    }, 15000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intercept ALL Clerk API calls and log errors
  useEffect(() => {
    if (loopDetected.current) return;

    const originalFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const response = await originalFetch.apply(this, args);

      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].toString() : '';
      const method = (args[1]?.method || 'GET').toUpperCase();
      const isClerkApi = url.includes('/v1/client/') || url.includes('/v1/me') || url.includes('clerk.');

      if (isClerkApi) {
        const shortUrl = url.replace(/https?:\/\/[^/]+/, '');
        console.log(`[SSO-Callback] Clerk API: ${method} ${shortUrl} → ${response.status}`);

        // Log ALL non-2xx responses from Clerk
        if (response.status >= 300) {
          let bodyText = '';
          try {
            const cloned = response.clone();
            bodyText = await cloned.text();
          } catch { /* ignore */ }

          const log: ClerkApiLog = {
            ts: new Date().toISOString().slice(11, 19),
            method,
            url: shortUrl.slice(0, 80),
            status: response.status,
            body: bodyText.slice(0, 300),
          };
          addLog(log);
          console.error('[SSO-Callback] Clerk API Error:', log);

          // Specific error handling
          if (response.status === 403) {
            clearSsoAttempts();
            setCallbackError(
              `שגיאה 403 מ-Clerk API: ${shortUrl}\n\nתגובת השרת: ${bodyText.slice(0, 200)}`
            );
          }
          if (response.status === 422) {
            clearSsoAttempts();
            setCallbackError(
              `שגיאה 422 (Validation) מ-Clerk API: ${shortUrl}\n\nתגובת השרת: ${bodyText.slice(0, 200)}`
            );
          }
          if (response.status === 429) {
            clearSsoAttempts();
            setCallbackError(
              'בקשות רבות מדי למערכת האימות (שגיאה 429). אנא המתן דקה ונסה שוב.'
            );
          }
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (callbackError) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 520, padding: '0 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>שגיאה באימות</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'left', direction: 'ltr', background: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12 }}>{callbackError}</div>
          {debugInfo && (
            <details style={{ textAlign: 'left', direction: 'ltr', marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>Debug Info</summary>
              <pre style={{ fontSize: 11, background: '#1e293b', color: '#e2e8f0', padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>{debugInfo}</pre>
            </details>
          )}
          {apiLogs.length > 0 && (
            <details style={{ textAlign: 'left', direction: 'ltr', marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>API Logs ({apiLogs.length})</summary>
              <div style={{ fontSize: 11, background: '#1e293b', color: '#e2e8f0', padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 200 }}>
                {apiLogs.map((log, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <span style={{ color: log.status >= 400 ? '#f87171' : '#fbbf24' }}>[{log.status}]</span>{' '}
                    {log.method} {log.url}
                    {log.body && <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>{log.body}</div>}
                  </div>
                ))}
              </div>
            </details>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <button onClick={() => { clearSsoAttempts(); window.location.href = '/login'; }} style={{ padding: '10px 28px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              חזרה להתחברות
            </button>
            <button onClick={() => { clearSsoAttempts(); window.location.href = '/'; }} style={{ padding: '10px 28px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              דף הבית
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: '4px solid #e2e8f0',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#1e293b' }}>מאמת זהות...</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 700 }}>
          אנא המתן, מייד נעביר אותך למערכת
        </div>
      </div>

      <AuthenticateWithRedirectCallback
        signInUrl="/login"
        signUpUrl="/login?mode=sign-up"
        signInFallbackRedirectUrl="/me"
        signUpFallbackRedirectUrl="/me"
      />
    </div>
  );
}
