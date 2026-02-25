'use client';

import { useAuth, useSignUp, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LoginView } from "../../views/LoginView";
import { useEffect, useState, useRef, useCallback } from "react";
import CustomAuth from '@/components/social/CustomAuth';
import { normalizeLegacyRedirectPath, toWorkspacePathForOrgSlug } from '@/lib/os/legacy-routing';
import { extractData } from '@/lib/shared/api-types';
import { ShieldCheck, Zap } from 'lucide-react';
import { getSystemIconUrl } from '@/lib/metadata';

type WorkspacesApiItem = {
  id?: string;
  slug?: string;
  entitlements?: Record<string, boolean>;
  onboardingComplete?: boolean;
};

type WorkspacesApiPayload = {
  workspaces?: WorkspacesApiItem[];
};

// Reduced retries for faster login experience
const MAX_WORKSPACE_RETRIES = 2;
const WORKSPACE_RETRY_DELAY = 500;

async function resolveFirstWorkspace(): Promise<{ orgSlug: string | null; entitlements: Record<string, boolean>; onboardingComplete: boolean }> {
  for (let attempt = 0; attempt < MAX_WORKSPACE_RETRIES; attempt++) {
    try {
      // Fetch workspaces and last location in parallel
      const [workspacesRes, lastLocationRes] = await Promise.all([
        fetch('/api/workspaces', { cache: 'no-store' }),
        fetch('/api/user/last-location', { cache: 'no-store' }).catch(() => null),
      ]);

      if (!workspacesRes.ok) {
        if (attempt < MAX_WORKSPACE_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, WORKSPACE_RETRY_DELAY));
          continue;
        }
        return { orgSlug: null, entitlements: {}, onboardingComplete: false };
      }

      const data: unknown = await workspacesRes.json();
      const payload = extractData<WorkspacesApiPayload>(data);
      const workspaces = Array.isArray(payload?.workspaces) ? payload.workspaces : [];

      if (workspaces.length === 0 && attempt < MAX_WORKSPACE_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, WORKSPACE_RETRY_DELAY));
        continue;
      }

      if (workspaces.length === 0) {
        return { orgSlug: null, entitlements: {}, onboardingComplete: false };
      }

      // Workspace selection priority:
      // 1. Last visited workspace (if user still has access)
      // 2. Primary workspace (from /api/workspaces - already sorted)
      // 3. First available workspace (fallback)
      let selectedWorkspace = workspaces[0];

      if (lastLocationRes?.ok) {
        const lastLocationData = extractData<{ orgSlug?: string | null }>(await lastLocationRes.json());
        const lastOrgSlug = lastLocationData?.orgSlug ? String(lastLocationData.orgSlug) : null;
        if (lastOrgSlug) {
          const lastWorkspace = workspaces.find(
            (w) => String(w.slug) === lastOrgSlug || String(w.id) === lastOrgSlug
          );
          if (lastWorkspace) {
            selectedWorkspace = lastWorkspace;
          }
        }
      }

      const orgSlug = selectedWorkspace.slug ?? selectedWorkspace.id ?? null;
      const entitlements: Record<string, boolean> =
        selectedWorkspace.entitlements && typeof selectedWorkspace.entitlements === 'object'
          ? selectedWorkspace.entitlements
          : {};

      const onboardingComplete = Boolean(selectedWorkspace.onboardingComplete);

      return { orgSlug: orgSlug ? String(orgSlug) : null, entitlements, onboardingComplete };
    } catch (err) {
      if (attempt < MAX_WORKSPACE_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, WORKSPACE_RETRY_DELAY));
        continue;
      }
      return { orgSlug: null, entitlements: {}, onboardingComplete: false };
    }
  }
  return { orgSlug: null, entitlements: {}, onboardingComplete: false };
}

/** Generate a unique username from an email address (Clerk requires username). */
function generateUsername(email: string): string {
  const prefix = (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'user';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${suffix}`;
}

export default function LoginPageClient({ initialUserId }: { initialUserId: string | null }) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const router = useRouter();
  const [continuationState, setContinuationState] = useState<'idle' | 'handling' | 'done' | 'failed'>('idle');
  const continuationAttempted = useRef(false);

  const getRedirectTarget = useCallback(() => {
    if (typeof window === 'undefined') return '/me';
    const sp = new URLSearchParams(window.location.search);
    return sp.get('redirect') || '/me';
  }, []);

  // ── OAuth continuation handler (#/continue) ──
  // When Clerk redirects back with #/continue, the signUp/signIn objects
  // already contain the ongoing auth attempt. We check their state and
  // auto-complete the flow (including transfer between sign-up ↔ sign-in).
  useEffect(() => {
    if (!isLoaded || !signUpLoaded || !signInLoaded) return;
    if (isSignedIn) return;
    if (continuationAttempted.current) return;

    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash.includes('continue')) return;

    continuationAttempted.current = true;
    setContinuationState('handling');

    const handleContinuation = async () => {
      try {
        // --- DIAGNOSTIC LOGGING ---
        const suStatus = signUp?.status ?? 'null';
        const siStatus = signIn?.status ?? 'null';
        const suSessionId = signUp?.createdSessionId ?? 'none';
        const siSessionId = signIn?.createdSessionId ?? 'none';
        const suVerifications = signUp && typeof signUp === 'object'
          ? (signUp as unknown as Record<string, unknown>).verifications
          : null;
        const siFirstFactor = signIn && typeof signIn === 'object'
          ? (signIn as unknown as Record<string, unknown>).firstFactorVerification
          : null;
        const suMissing = signUp && typeof signUp === 'object'
          ? (signUp as unknown as Record<string, unknown>).missingFields
          : null;
        console.log('[Login] ===== OAuth Continuation Debug =====');
        console.log('[Login] signUp.status:', suStatus);
        console.log('[Login] signUp.createdSessionId:', suSessionId);
        console.log('[Login] signUp.verifications:', JSON.stringify(suVerifications, null, 2));
        console.log('[Login] signUp.missingFields:', JSON.stringify(suMissing));
        console.log('[Login] signIn.status:', siStatus);
        console.log('[Login] signIn.createdSessionId:', siSessionId);
        console.log('[Login] signIn.firstFactorVerification:', JSON.stringify(siFirstFactor, null, 2));
        console.log('[Login] ==========================================');
        // --- END DIAGNOSTIC LOGGING ---

        // Case 1: Sign-up completed — just needs session activation
        if (signUp?.status === 'complete' && signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
          setContinuationState('done');
          router.push(getRedirectTarget());
          return;
        }

        // Case 2: Sign-in completed
        if (signIn?.status === 'complete' && signIn.createdSessionId) {
          await setActive({ session: signIn.createdSessionId });
          setContinuationState('done');
          router.push(getRedirectTarget());
          return;
        }

        // Case 3: Transfer sign-up → sign-in
        // User tried to sign UP with Google but already has a Clerk account.
        // signUp.verifications.externalAccount.status === 'transferable'
        const suExtAccount = suVerifications && typeof suVerifications === 'object'
          ? (suVerifications as Record<string, unknown>).externalAccount as Record<string, unknown> | undefined
          : undefined;
        const externalAccountStatus = suExtAccount?.status;

        if (externalAccountStatus === 'transferable' && signIn) {
          const res = await signIn.create({ transfer: true } as Parameters<typeof signIn.create>[0]);
          if (res.status === 'complete' && res.createdSessionId) {
            await setActive({ session: res.createdSessionId });
            setContinuationState('done');
            router.push(getRedirectTarget());
            return;
          }
        }

        // Case 4: Transfer sign-in → sign-up
        // User tried to sign IN with Google but doesn't have a Clerk account yet.
        // signIn.firstFactorVerification.status === 'transferable'
        const firstFactorStatus = siFirstFactor && typeof siFirstFactor === 'object'
          ? (siFirstFactor as Record<string, unknown>).status
          : undefined;

        if (firstFactorStatus === 'transferable' && signUp) {
          const res = await signUp.create({ transfer: true } as Parameters<typeof signUp.create>[0]);
          if (res.status === 'complete' && res.createdSessionId) {
            await setActive({ session: res.createdSessionId });
            setContinuationState('done');
            router.push(getRedirectTarget());
            return;
          }
        }

        // Case 5: Sign-up has missing_requirements (e.g. username after OAuth)
        // Clerk requires username but Google doesn't provide one.
        if (signUp?.status === 'missing_requirements') {
          const signUpRecord = signUp as unknown as Record<string, unknown>;
          const missing: string[] = Array.isArray(signUpRecord.missingFields)
            ? signUpRecord.missingFields as string[]
            : [];
          console.log('[Login] Case 5: missing_requirements, fields:', missing);

          const suEmail = typeof signUpRecord.emailAddress === 'string'
            ? signUpRecord.emailAddress
            : 'user';

          // First: try a reload — Clerk may have completed server-side
          try {
            const reloaded = await signUp.reload();
            if (reloaded.status === 'complete' && reloaded.createdSessionId) {
              await setActive({ session: reloaded.createdSessionId });
              setContinuationState('done');
              router.push(getRedirectTarget());
              return;
            }
          } catch { /* continue to update */ }

          const updatePayload: Record<string, string> = {};

          if (missing.includes('username')) {
            updatePayload.username = generateUsername(suEmail);
          }
          if (missing.includes('first_name')) {
            updatePayload.firstName = suEmail.split('@')[0] || 'user';
          }
          if (missing.includes('last_name')) {
            updatePayload.lastName = suEmail.split('@')[0] || 'user';
          }

          // Fallback: missingFields is empty but status is still missing_requirements.
          // Most common cause: Clerk Dashboard requires "username" but Google doesn't provide one.
          if (Object.keys(updatePayload).length === 0) {
            console.log('[Login] Case 5: missingFields empty, injecting username as fallback');
            updatePayload.username = generateUsername(suEmail);
          }

          const tryUpdate = async (payload: Record<string, string>): Promise<boolean> => {
            try {
              await signUp.update(payload);
              const reloaded = await signUp.reload();
              if (reloaded.status === 'complete' && reloaded.createdSessionId) {
                await setActive({ session: reloaded.createdSessionId });
                setContinuationState('done');
                router.push(getRedirectTarget());
                return true;
              }
              console.log('[Login] Case 5: after update, status is still:', reloaded.status);
              return false;
            } catch (e) {
              console.error('[Login] Case 5 update error:', e);
              return false;
            }
          };

          // Attempt 1: full payload
          if (await tryUpdate(updatePayload)) return;

          // Attempt 2: retry username with new random suffix (collision avoidance)
          if (updatePayload.username) {
            const payload2 = { ...updatePayload, username: generateUsername(suEmail) };
            if (await tryUpdate(payload2)) return;

            // Attempt 3: without username (in case username is not actually required)
            const payloadNoUser = { ...updatePayload };
            delete payloadNoUser.username;
            if (Object.keys(payloadNoUser).length > 0) {
              if (await tryUpdate(payloadNoUser)) return;
            }
          }
        }

        // Could not auto-complete — fall through to show the form
        console.error('[Login] OAuth continuation: NO CASE MATCHED. signUp.status:', suStatus, 'signIn.status:', siStatus);
        setContinuationState('failed');
        // Remove #/continue hash so page refresh doesn't re-trigger continuation
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (err) {
        console.error('[Login] OAuth continuation EXCEPTION:', err);
        console.error('[Login] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err as object)));
        setContinuationState('failed');
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    };

    handleContinuation();
  }, [isLoaded, signUpLoaded, signInLoaded, isSignedIn, signUp, signIn, setActive, getRedirectTarget]);

  useEffect(() => {
    if (!isLoaded) return;

    // If user is signed in, redirect to their first available OS
    if (isSignedIn && userId) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectPath =
        searchParams.get('redirect') ||
        searchParams.get('redirect_url') ||
        searchParams.get('redirectUrl');
      const normalizedRedirectPath = redirectPath ? (normalizeLegacyRedirectPath(redirectPath) || redirectPath) : null;

      const isLoginRedirect = (value: string | null) => {
        if (!value) return false;
        const v = String(value).trim().toLowerCase();
        return v === '/login' || v.startsWith('/login?') || v.startsWith('/login#') || v.startsWith('/sign-in') || v.startsWith('/sign-up');
      };
      
      // If redirect parameter exists and is valid, go there
      if (
        normalizedRedirectPath &&
        normalizedRedirectPath.startsWith('/') &&
        !normalizedRedirectPath.startsWith('//') &&
        !isLoginRedirect(normalizedRedirectPath)
      ) {
        (async () => {
          const { orgSlug } = await resolveFirstWorkspace();
          if (orgSlug) {
            router.push(toWorkspacePathForOrgSlug(orgSlug, normalizedRedirectPath));
            return;
          }
          router.push(normalizedRedirectPath);
        })();
      } else {
        (async () => {
          try {
            const { orgSlug, entitlements, onboardingComplete } = await resolveFirstWorkspace();
            
            if (!orgSlug) {
              router.push('/workspaces/new');
              return;
            }

            // If onboarding is not complete (no plan selected), send to onboarding
            if (!onboardingComplete) {
              router.push('/workspaces/onboarding');
              return;
            }

            const priority: Array<{ key: string; route: string }> = [
              { key: 'nexus', route: `/w/${encodeURIComponent(String(orgSlug))}/nexus` },
              { key: 'system', route: `/w/${encodeURIComponent(String(orgSlug))}/system` },
              { key: 'operations', route: `/w/${encodeURIComponent(String(orgSlug))}/operations` },
              { key: 'social', route: `/w/${encodeURIComponent(String(orgSlug))}/social` },
              { key: 'finance', route: `/w/${encodeURIComponent(String(orgSlug))}/finance` },
              { key: 'client', route: `/w/${encodeURIComponent(String(orgSlug))}/client` },
            ];

            const first = priority.find(p => Boolean(entitlements[p.key]));
            const targetRoute = first?.route || '/workspaces';
            router.push(targetRoute);
          } catch (error) {
            console.error('[Login] Error during redirect:', error);
            router.push('/workspaces/new');
          }
        })();
      }
    } else {
      // Show login view when Clerk is loaded and user is not signed in
    }
  }, [isSignedIn, isLoaded, userId, router]);

  // Show loading state while OAuth continuation is being handled (#/continue)
  if (continuationState === 'handling' || continuationState === 'done') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
        <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur px-8 py-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] flex flex-col items-center">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-indigo-500 rounded-full mb-4" style={{ animation: 'spin 0.7s linear infinite' }} />
          <div className="text-slate-900 font-black text-lg">משלים את ההתחברות…</div>
          <div className="text-sm text-slate-500 mt-1" style={{ animation: 'pulse-subtle 2s ease-in-out infinite' }}>מעבד את פרטי החשבון</div>
        </div>
      </div>
    );
  }

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
        <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur px-8 py-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] flex flex-col items-center">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-indigo-500 rounded-full mb-4" style={{ animation: 'spin 0.7s linear infinite' }} />
          <div className="text-slate-900 font-black text-lg">מכינים את החשבון שלך…</div>
          <div className="text-sm text-slate-500 mt-1" style={{ animation: 'pulse-subtle 2s ease-in-out infinite' }}>רגע אחד</div>
        </div>
      </div>
    );
  }

  // If user is signed in, show loading while redirect happens
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
        <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur px-8 py-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] flex flex-col items-center">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-indigo-500 rounded-full mb-4" style={{ animation: 'spin 0.7s linear infinite' }} />
          <div className="text-slate-900 font-black text-lg">מעביר אותך למערכת…</div>
          <div className="text-sm text-slate-500 mt-1" style={{ animation: 'pulse-subtle 2s ease-in-out infinite' }}>טוען את סביבת העבודה שלך</div>
        </div>
      </div>
    );
  }

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const mode = (searchParams.get('mode') || '').toLowerCase();
  const isSignUpMode = mode === 'sign-up' || mode === 'signup' || mode === 'register';

  const ssoError = searchParams.get('error');
  const ssoErrorMessage = ssoError === 'sso_timeout'
    ? 'תהליך האימות לקח יותר מדי זמן. נא לנסות שוב.'
    : ssoError === 'sso_failed'
      ? 'ההרשמה נכשלה. ייתכן שהרשמות חדשות מוגבלות. נא ליצור קשר עם התמיכה.'
      : null;

  if (isSignUpMode) {
    return (
      <div className="min-h-screen bg-white flex flex-row overflow-hidden" dir="rtl">
        <main className="w-full flex flex-row">

          {/* Right Side — Brand Panel (identical to sign-in) */}
          <div className="hidden lg:flex lg:w-1/2 bg-black relative flex-col justify-between p-12 text-white overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                  <img src={getSystemIconUrl('misrad')} alt="Logo" className="w-full h-full object-contain p-1.5" />
                </div>
                <span className="font-bold text-3xl tracking-tight">MISRAD AI</span>
              </div>
              <h2 className="text-5xl font-bold leading-tight max-w-md">
                הצטרף למערכת,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ברמה הבאה.</span>
              </h2>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                  <ShieldCheck size={16} className="text-green-400" /> אבטחה מקצה לקצה
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                  <Zap size={16} className="text-yellow-400" /> ביצועים מהירים
                </div>
              </div>
              <p className="text-gray-500 text-xs flex items-center gap-2">
                <span>Powered by MISRAD AI</span>
                <span>&copy; 2026 MISRAD AI.</span>
              </p>
            </div>
          </div>

          {/* Left Side — Sign-Up Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600 lg:hidden" />

            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-right">
                <div className="lg:hidden flex justify-center mb-4">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex items-center justify-center">
                    <img src={getSystemIconUrl('misrad')} alt="Logo" className="w-full h-full object-contain p-2" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">הצטרפות למערכת</h3>
                <p className="text-gray-500">
                  צור חשבון חדש והתחל לנהל את העסק שלך בצורה חכמה
                </p>
              </div>

              {ssoErrorMessage && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
                  {ssoErrorMessage}
                </div>
              )}

              <div className="bg-white p-2 rounded-3xl shadow-xl shadow-gray-200/50 border border-white">
                <div className="p-6">
                  <CustomAuth mode="sign-up" onSuccess={() => {
                    const sp = new URLSearchParams(window.location.search);
                    const redirect = sp.get('redirect');
                    router.push(redirect && !redirect.startsWith('/login') ? redirect : '/workspaces/new');
                  }} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.location.href = '/login'}
                className="mt-4 w-full bg-white text-slate-900 border border-slate-200 py-3.5 rounded-xl text-sm font-black hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                כבר יש לך חשבון? התחבר כאן
              </button>
            </div>
          </div>

        </main>
      </div>
    );
  }

  // Show login view
  const loginMode = isSignUpMode ? "sign-up" : "sign-in";
  return <LoginView mode={loginMode} />;
}
