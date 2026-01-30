'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function WorkspaceCanonicalRedirect({
  currentOrgSlug,
  canonicalSlug,
}: {
  currentOrgSlug: string;
  canonicalSlug: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  let clerkUser: ReturnType<typeof useUser>['user'] | null = null;
  let clerkIsLoaded = true;

  try {
    const clerk = useUser();
    clerkUser = clerk.user;
    clerkIsLoaded = clerk.isLoaded;
  } catch {
    clerkUser = null;
    clerkIsLoaded = true;
  }

  const user = clerkUser;
  const isLoaded = clerkIsLoaded;

  useEffect(() => {
    if (!canonicalSlug) return;
    if (!pathname) return;

    // If we're already on canonical slug, do nothing.
    if (String(currentOrgSlug) === String(canonicalSlug)) return;

    // Only canonicalize when the current URL is using a UUID; avoids surprising redirects
    // for custom non-uuid routes.
    if (!isUuid(currentOrgSlug)) return;

    const prefix = `/w/${encodeURIComponent(String(currentOrgSlug))}`;
    if (!pathname.startsWith(prefix)) return;

    const nextPath = `/w/${encodeURIComponent(String(canonicalSlug))}${pathname.slice(prefix.length)}`;
    router.replace(nextPath);
  }, [canonicalSlug, currentOrgSlug, pathname, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoaded) return;

    const isSuperAdmin = user?.publicMetadata?.isSuperAdmin === true;
    if (!isSuperAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
        if (!orgSlug) return;

        const returnTo = `${window.location.pathname}${window.location.search || ''}`;

        router.push(`/app/admin?returnTo=${encodeURIComponent(returnTo)}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoaded, router, user?.publicMetadata?.isSuperAdmin]);

  return null;
}
