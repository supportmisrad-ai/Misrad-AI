'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';

export const dynamic = 'force-dynamic';

const SSO_ATTEMPT_KEY = 'sso_callback_attempt';
const MAX_SSO_ATTEMPTS = 5;

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
  const loopDetected = useRef(false);

  // Detect redirect loops: if we've been here too many times, stop and show error
  useEffect(() => {
    const attempts = incrementSsoAttempt();
    if (attempts > MAX_SSO_ATTEMPTS) {
      loopDetected.current = true;
      clearSsoAttempts();
      setCallbackError(
        'ההרשמה נכשלה מספר פעמים ברצף. ייתכן שהרשמות חדשות חסומות. נא ליצור קשר עם התמיכה או לנסות שוב מאוחר יותר.'
      );
      return;
    }

    // Clear attempts after successful navigation (5s grace period)
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
      setCallbackError(
        'תהליך האימות לקח יותר מדי זמן. ייתכן שיש בעיה בהגדרות ההרשמה. נא לנסות שוב.'
      );
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for 403 errors from Clerk API calls
  useEffect(() => {
    if (loopDetected.current) return;

    const originalFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const response = await originalFetch.apply(this, args);

      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].toString() : '';
      if (url.includes('/v1/client/sign_ups') && response.status === 403) {
        clearSsoAttempts();
        setCallbackError(
          'הרשמה חדשה חסומה על ידי מערכת האימות (שגיאה 403). ייתכן שהרשמות חדשות מוגבלות. נא ליצור קשר עם התמיכה.'
        );
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (callbackError) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 20px' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>שגיאה באימות</div>
          <div style={{ fontSize: 14, color: '#64748b', fontWeight: 700, lineHeight: 1.6 }}>{callbackError}</div>
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
