'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

export default function SsoCallbackPage() {
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Safety valve: if SSO callback is stuck for 20s, redirect to login
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/login?error=sso_timeout';
    }, 20000);
    return () => clearTimeout(timer);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (callbackError) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#ef4444' }}>שגיאה באימות</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 700 }}>{callbackError}</div>
          <button onClick={() => window.location.href = '/login'} style={{ marginTop: 16, padding: '8px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>חזרה להתחברות</button>
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
