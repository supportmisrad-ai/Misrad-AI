'use client';

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LoginView } from "../../views/LoginView";
import { useEffect } from "react";
import CustomAuth from '@/components/social/CustomAuth';
import { normalizeLegacyRedirectPath, toWorkspacePathForOrgSlug } from '@/lib/os/legacy-routing';

export default function LoginPageClient({ initialUserId }: { initialUserId: string | null }) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();

  console.log('[LoginPageClient] Rendered - isLoaded:', isLoaded, 'isSignedIn:', isSignedIn, 'userId:', userId);

  const resolveFirstOrgSlug = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/workspaces', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      const payload = (data as any)?.data && typeof (data as any).data === 'object' ? (data as any).data : data;
      const first = Array.isArray((payload as any)?.workspaces) ? (payload as any).workspaces[0] : null;
      const orgSlug = first?.slug || first?.id;
      return orgSlug ? String(orgSlug) : null;
    } catch {
      return null;
    }
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
      
      // If redirect parameter exists and is valid, go there
      if (normalizedRedirectPath && normalizedRedirectPath.startsWith('/') && !normalizedRedirectPath.startsWith('//')) {
        (async () => {
          const orgSlug = await resolveFirstOrgSlug();
          if (orgSlug) {
            router.push(toWorkspacePathForOrgSlug(orgSlug, normalizedRedirectPath));
            return;
          }
          router.push(normalizedRedirectPath);
        })();
      } else {
        (async () => {
          try {
            const orgSlug = await resolveFirstOrgSlug();
            console.log('[Login] Resolved orgSlug:', orgSlug);
            
            if (!orgSlug) {
              console.log('[Login] No workspace found, redirecting to onboarding');
              router.push('/workspaces/onboarding');
              return;
            }

            const res = await fetch('/api/os/rooms', {
              cache: 'no-store',
              headers: {
                'x-org-id': encodeURIComponent(String(orgSlug)),
              },
            });
            
            console.log('[Login] /api/os/rooms status:', res.status);
            
            if (!res.ok) {
              router.push('/workspaces');
              return;
            }

            const data = await res.json();
            const payload = (data as any)?.data && typeof (data as any).data === 'object' ? (data as any).data : data;
            const rooms = (payload as any)?.rooms || {};

            console.log('[Login] Available rooms:', rooms);

            const priority: Array<{ key: string; route: string }> = [
              { key: 'nexus', route: `/w/${encodeURIComponent(String(orgSlug))}/nexus` },
              { key: 'system', route: `/w/${encodeURIComponent(String(orgSlug))}/system` },
              { key: 'social', route: `/w/${encodeURIComponent(String(orgSlug))}/social` },
              { key: 'finance', route: `/w/${encodeURIComponent(String(orgSlug))}/finance` },
              { key: 'client', route: `/w/${encodeURIComponent(String(orgSlug))}/client` },
            ];

            const first = priority.find(p => Boolean((rooms as any)?.[p.key]));
            const targetRoute = first?.route || '/workspaces';
            console.log('[Login] Redirecting to:', targetRoute);
            router.push(targetRoute);
          } catch (error) {
            console.error('[Login] Error during redirect:', error);
            router.push('/workspaces');
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

  // If user is signed in, show nothing (redirect will happen)
  if (isSignedIn) {
    return null;
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
