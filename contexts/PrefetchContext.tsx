'use client';

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * PrefetchContext - Intelligent route prefetching for instant navigation
 * 
 * Automatically prefetches routes based on:
 * 1. Current module (prefetches sibling routes)
 * 2. Common navigation patterns
 * 3. Hover intent on links
 * 4. Visible links in viewport
 */

interface PrefetchContextValue {
  prefetch: (href: string) => void;
  prefetchModuleRoutes: (moduleKey: string, orgSlug: string) => void;
}

const PrefetchContext = createContext<PrefetchContextValue | null>(null);

// Module route mappings for intelligent prefetching
const MODULE_ROUTES: Record<string, string[]> = {
  system: ['/system', '/system/leads', '/system/calendar', '/system/analytics', '/system/settings'],
  nexus: ['/nexus', '/nexus/dashboard', '/nexus/team'],
  social: ['/social', '/social/dashboard', '/social/calendar', '/social/inbox'],
  finance: ['/finance', '/finance/overview', '/finance/invoices', '/finance/expenses'],
  client: ['/client', '/client/dashboard', '/client/clients', '/client/me'],
  operations: ['/operations', '/operations/projects', '/operations/inventory', '/operations/settings'],
};

// Common cross-module routes
const COMMON_ROUTES = ['/me', '/notifications', '/support'];

export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const orgSlugRef = useRef<string | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Extract orgSlug from pathname
  useEffect(() => {
    const match = pathname?.match(/^\/w\/([^\/]+)/);
    if (match) {
      orgSlugRef.current = match[1];
    }
  }, [pathname]);

  const prefetch = useCallback((href: string) => {
    if (prefetchedRef.current.has(href)) return;
    if (!href.startsWith('/')) return;
    
    try {
      router.prefetch(href);
      prefetchedRef.current.add(href);
      if (process.env.NODE_ENV === 'development') {
        console.log('[Prefetch] Prefetched:', href);
      }
    } catch {
      // Silent fail - prefetch is optimization, not requirement
    }
  }, [router]);

  const prefetchModuleRoutes = useCallback((moduleKey: string, orgSlug: string) => {
    const routes = MODULE_ROUTES[moduleKey];
    if (!routes) return;

    // Prefetch all module routes with staggered timing
    routes.forEach((route, index) => {
      setTimeout(() => {
        prefetch(`/w/${orgSlug}${route}`);
      }, index * 100); // Stagger by 100ms to avoid burst
    });

    // Also prefetch common routes
    COMMON_ROUTES.forEach((route, index) => {
      setTimeout(() => {
        prefetch(`/w/${orgSlug}${route}`);
      }, (routes.length + index) * 100);
    });
  }, [prefetch]);

  // Set up intersection observer for visible links
  useEffect(() => {
    if (typeof window === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const href = entry.target.getAttribute('data-prefetch');
            if (href) {
              prefetch(href);
            }
          }
        });
      },
      { rootMargin: '200px' } // Prefetch when within 200px of viewport
    );

    // Observe all links with data-prefetch
    const links = document.querySelectorAll('a[data-prefetch]');
    links.forEach((link) => observerRef.current?.observe(link));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [pathname, prefetch]);

  // Prefetch current module routes when orgSlug changes
  useEffect(() => {
    const orgSlug = orgSlugRef.current;
    if (!orgSlug || !pathname) return;

    // Detect current module from pathname
    const moduleMatch = pathname.match(/^\/w\/[^\/]+\/([^\/]+)/);
    if (moduleMatch) {
      const currentModule = moduleMatch[1];
      if (MODULE_ROUTES[currentModule]) {
        // Small delay to not compete with initial render
        setTimeout(() => {
          prefetchModuleRoutes(currentModule, orgSlug);
        }, 500);
      }
    }
  }, [pathname, prefetchModuleRoutes]);

  return (
    <PrefetchContext.Provider value={{ prefetch, prefetchModuleRoutes }}>
      {children}
    </PrefetchContext.Provider>
  );
}

export function usePrefetch() {
  const context = useContext(PrefetchContext);
  if (!context) {
    throw new Error('usePrefetch must be used within PrefetchProvider');
  }
  return context;
}

/**
 * PrefetchLink - Link component with intelligent prefetching
 */
interface PrefetchLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  prefetchOnHover?: boolean;
  prefetchOnVisible?: boolean;
}

export function PrefetchLink({
  href,
  children,
  prefetchOnHover = true,
  prefetchOnVisible = true,
  onMouseEnter,
  ...props
}: PrefetchLinkProps) {
  const { prefetch } = usePrefetch();

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetchOnHover) {
      prefetch(href);
    }
    onMouseEnter?.(e);
  }, [href, prefetch, prefetchOnHover, onMouseEnter]);

  return (
    <a
      href={href}
      data-prefetch={prefetchOnVisible ? href : undefined}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </a>
  );
}
