'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * DynamicFavicon - Updates the browser favicon based on organization logo
 * Falls back to Scale logo if no organization logo exists
 */
export const DynamicFavicon: React.FC = () => {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateFavicon = (iconUrl: string) => {
            const type = iconUrl.endsWith('.svg')
                ? 'image/svg+xml'
                : iconUrl.endsWith('.png')
                  ? 'image/png'
                  : iconUrl.endsWith('.ico')
                    ? 'image/x-icon'
                    : 'image/png';

            let link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement | null;
            if (!link) {
                link = document.createElement('link');
                link.id = 'dynamic-favicon';
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.type = type;
            link.href = iconUrl;

            let appleLink = document.querySelector('link#dynamic-apple-touch-icon') as HTMLLinkElement | null;
            if (!appleLink) {
                appleLink = document.createElement('link');
                appleLink.id = 'dynamic-apple-touch-icon';
                appleLink.rel = 'apple-touch-icon';
                document.head.appendChild(appleLink);
            }
            appleLink.href = iconUrl;
        };

        const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');

        const iconByRoute = (p: string) => {
            if (/(^|\/)(nexus(-os)?)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/nexus(\/|$)/i.test(p)) return '/icons/nexus-icon.svg';
            if (/(^|\/)(system(-os)?)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/system(\/|$)/i.test(p)) return '/icons/system-icon.svg';
            if (/(^|\/)(social)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/social(\/|$)/i.test(p)) return '/icons/social-icon.svg';
            if (/(^|\/)(finance)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/finance(\/|$)/i.test(p)) return '/icons/finance-icon.svg';
            return '/icons/misrad-icon.svg';
        };

        const match = path.match(/\/w\/([^/]+)(?:\/|$)/i);
        const orgSlug = match?.[1] ? decodeURIComponent(match[1]) : null;

        const getCachedGlobalLogo = () => {
            try {
                const stored = sessionStorage.getItem('global_default_logo_url');
                if (!stored) return null;
                const trimmed = stored.trim();
                return trimmed.length > 0 ? trimmed : null;
            } catch {
                return null;
            }
        };

        const setCachedGlobalLogo = (url: string | null) => {
            try {
                sessionStorage.setItem('global_default_logo_url', String(url || ''));
            } catch {
                // ignore
            }
        };

        const fetchGlobalLogo = async () => {
            const cached = getCachedGlobalLogo();
            if (cached) return cached;
            try {
                const res = await fetch('/api/branding/logo', { cache: 'no-store' });
                if (!res.ok) return null;
                const data = await res.json().catch(() => null);
                const url = data?.defaultLogoUrl ? String(data.defaultLogoUrl).trim() : '';
                const finalUrl = url.length > 0 ? url : null;
                setCachedGlobalLogo(finalUrl);
                return finalUrl;
            } catch {
                return null;
            }
        };

        if (!orgSlug) {
            let cancelled = false;
            (async () => {
                const globalLogo = await fetchGlobalLogo();
                if (cancelled) return;
                updateFavicon(globalLogo || iconByRoute(path));
            })();

            return () => {
                cancelled = true;
            };
        }

        let cancelled = false;
        (async () => {
            try {
                const [workspacesRes, globalLogo] = await Promise.all([
                    fetch('/api/workspaces', { cache: 'no-store' }),
                    fetchGlobalLogo()
                ]);

                if (!workspacesRes.ok) throw new Error('Failed to load workspaces');
                const data = await workspacesRes.json().catch(() => null);
                const workspaces = (data?.workspaces || []) as Array<{ slug: string; id: string; logo?: string | null }>;
                const ws = workspaces.find(w => String(w.slug) === String(orgSlug) || String(w.id) === String(orgSlug));
                const logo = ws?.logo ? String(ws.logo) : '';
                if (cancelled) return;
                updateFavicon((logo && logo.length > 0 ? logo : globalLogo) || iconByRoute(path));
            } catch {
                if (cancelled) return;
                const globalLogo = await fetchGlobalLogo();
                if (cancelled) return;
                updateFavicon(globalLogo || iconByRoute(path));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [pathname]);

    return null; // This component doesn't render anything
};

