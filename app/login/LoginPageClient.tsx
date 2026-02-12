'use client';

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LoginView } from "../../views/LoginView";
import { useEffect } from "react";
import CustomAuth from '@/components/social/CustomAuth';
import { normalizeLegacyRedirectPath, toWorkspacePathForOrgSlug } from '@/lib/os/legacy-routing';
import { extractData } from '@/lib/shared/api-types';

type WorkspacesApiItem = {
  id?: string;
  slug?: string;
  entitlements?: Record<string, boolean>;
};

type WorkspacesApiPayload = {
  workspaces?: WorkspacesApiItem[];
};

export default function LoginPageClient({ initialUserId }: { initialUserId: string | null }) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();

  console.log('[LoginPageClient] Rendered - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn, 'userId:', userId);

  const resolveFirstWorkspace = async (): Promise<{ orgSlug: string | null; entitlements: Record<string, boolean> }> => {
    const maxRetries = 5;
    const retryDelay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch('/api/workspaces', { cache: 'no-store' });
        if (!res.ok) {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          return { orgSlug: null, entitlements: {} };
        }
        
        const data: unknown = await res.json();
        const payload = extractData<WorkspacesApiPayload>(data);

        const workspaces = Array.isArray(payload?.workspaces) ? payload.workspaces : [];
        
        if (workspaces.length === 0 && attempt < maxRetries - 1) {
          console.log(`[LoginPageClient] No workspaces found, retrying (${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        const first = workspaces[0] ?? null;
        const orgSlug = first?.slug ?? first?.id ?? null;

        const entitlements: Record<string, boolean> = first?.entitlements && typeof first.entitlements === 'object'
          ? first.entitlements
          : {};

        return { orgSlug: orgSlug ? String(orgSlug) : null, entitlements };
      } catch (err) {
        console.error(`[LoginPageClient] Error fetching workspaces (attempt ${attempt + 1}/${maxRetries}):`, err);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        return { orgSlug: null, entitlements: {} };
      }
    }

    return { orgSlug: null, entitlements: {} };
  };

  useEffect(() => {
    console.log('[LoginPageClient] useEffect triggered - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn, 'userId:', userId);
    
    // Wait for Clerk to load
    if (!isLoaded) {
      console.log('[LoginPageClient] Clerk not loaded yet, waiting...');
      return;
    }

    // If user is signed in, redirect to their first available OS
    if (isSignedIn && userId) {
      console.log('[LoginPageClient] User is authenticated, starting redirect logic');
      // Check if there's a redirect parameter in the URL (for direct OS access)
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
            const { orgSlug, entitlements } = await resolveFirstWorkspace();
            console.log('[Login] Resolved orgSlug:', orgSlug);
            
            if (!orgSlug) {
              console.log('[Login] No workspace found, provisioning a new workspace');
              router.push('/workspaces/new');
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
            console.log('[Login] Redirecting to:', targetRoute);
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

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
        <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur px-8 py-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="text-slate-900 font-black">מכינים את החשבון שלך…</div>
          <div className="text-sm text-slate-600 mt-2">רגע אחד</div>
        </div>
      </div>
    );
  }

  // If user is signed in, show loading while redirect happens
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
        <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur px-8 py-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="text-slate-900 font-black">מעביר אותך למערכת…</div>
          <div className="text-sm text-slate-600 mt-2">טוען את העסק שלך</div>
        </div>
      </div>
    );
  }

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const mode = (searchParams.get('mode') || '').toLowerCase();
  const isSignUpMode = mode === 'sign-up' || mode === 'signup' || mode === 'register';

  if (isSignUpMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
          <div className="text-2xl font-black text-slate-900">הרשמה</div>
          <div className="mt-2 text-sm text-slate-600 font-bold">צור חשבון כדי להמשיך</div>

          <div className="mt-6">
            <CustomAuth mode="sign-up" onSuccess={() => router.refresh()} />
          </div>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-6 w-full bg-white text-slate-900 border border-slate-200 py-3.5 rounded-xl text-sm font-black hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            כבר יש לך חשבון? כניסה
          </button>
        </div>
      </div>
    );
  }

  // Show login view
  return <LoginView />;
}
