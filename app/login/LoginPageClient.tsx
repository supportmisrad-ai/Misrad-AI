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

const MAX_WORKSPACE_RETRIES = 5;
const WORKSPACE_RETRY_DELAY = 1000;

async function resolveFirstWorkspace(): Promise<{ orgSlug: string | null; entitlements: Record<string, boolean> }> {
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
        return { orgSlug: null, entitlements: {} };
      }

      const data: unknown = await workspacesRes.json();
      const payload = extractData<WorkspacesApiPayload>(data);
      const workspaces = Array.isArray(payload?.workspaces) ? payload.workspaces : [];

      if (workspaces.length === 0 && attempt < MAX_WORKSPACE_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, WORKSPACE_RETRY_DELAY));
        continue;
      }

      if (workspaces.length === 0) {
        return { orgSlug: null, entitlements: {} };
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

      return { orgSlug: orgSlug ? String(orgSlug) : null, entitlements };
    } catch (err) {
      if (attempt < MAX_WORKSPACE_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, WORKSPACE_RETRY_DELAY));
        continue;
      }
      return { orgSlug: null, entitlements: {} };
    }
  }
  return { orgSlug: null, entitlements: {} };
}

export default function LoginPageClient({ initialUserId }: { initialUserId: string | null }) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();

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
            const { orgSlug, entitlements } = await resolveFirstWorkspace();
            
            if (!orgSlug) {
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
