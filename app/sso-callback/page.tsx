'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function SsoCallbackPage() {
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
      {/* Required by Clerk for Turnstile CAPTCHA in custom flows */}
      <div id="clerk-captcha" />

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
      />
    </div>
  );
}
