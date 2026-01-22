'use client';

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LoginView } from "../../views/LoginView";
import { useEffect, useState } from "react";

export default function LoginPageClient({ initialUserId }: { initialUserId: string | null }) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(true);

  const resolveFirstOrgSlug = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/workspaces', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      const first = Array.isArray(data?.workspaces) ? data.workspaces[0] : null;
      const orgSlug = first?.slug || first?.id;
      return orgSlug ? String(orgSlug) : null;
    } catch {
      return null;
    }
  };

  const toVillaPath = (orgSlug: string, path: string): string => {
    const base = `/w/${encodeURIComponent(String(orgSlug))}`;
    if (path === '/client-os' || path.startsWith('/client-os/')) return `${base}/client`;
    if (path === '/finance-os' || path.startsWith('/finance-os/')) return `${base}/finance`;
    if (path === '/system' || path.startsWith('/system/')) return `${base}/system`;
    if (path === '/social' || path.startsWith('/social/')) return `${base}/social`;
    if (path === '/app' || path.startsWith('/app/')) return `${base}/nexus`;
    if (path === '/nexus-os' || path.startsWith('/nexus-os/')) return `${base}/nexus`;
    if (path === '/pipeline' || path.startsWith('/pipeline/')) return `${base}/system`;
    return path;
  };

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) {
      return;
    }

    // If user is signed in, redirect to their first available OS
    if (isSignedIn && userId) {
      // Check if there's a redirect parameter in the URL (for direct OS access)
      const searchParams = new URLSearchParams(window.location.search);
      const redirectPath = searchParams.get('redirect');
      
      // If redirect parameter exists and is valid, go there
      if (redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
        (async () => {
          const orgSlug = await resolveFirstOrgSlug();
          if (orgSlug) {
            router.push(toVillaPath(orgSlug, redirectPath));
            return;
          }
          router.push(redirectPath);
        })();
      } else {
        (async () => {
          try {
            const orgSlug = await resolveFirstOrgSlug();
            if (!orgSlug) {
              router.push('/');
              return;
            }

            const res = await fetch('/api/os/rooms', { cache: 'no-store' });
            if (!res.ok) {
              router.push('/');
              return;
            }

            const data = await res.json();
            const rooms = data?.rooms || {};

            const priority: Array<{ key: string; route: string }> = [
              { key: 'nexus', route: `/w/${encodeURIComponent(String(orgSlug))}/nexus` },
              { key: 'system', route: `/w/${encodeURIComponent(String(orgSlug))}/system` },
              { key: 'social', route: `/w/${encodeURIComponent(String(orgSlug))}/social` },
              { key: 'finance', route: `/w/${encodeURIComponent(String(orgSlug))}/finance` },
              { key: 'client', route: `/w/${encodeURIComponent(String(orgSlug))}/client` },
            ];

            const first = priority.find(p => Boolean((rooms as any)?.[p.key]));
            router.push(first?.route || '/');
          } catch {
            router.push('/');
          }
        })();
      }
    } else {
      // Show login view when Clerk is loaded and user is not signed in
      setShowLogin(true);
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

  // Show login view
  return (
    <LoginView />
  );
}
