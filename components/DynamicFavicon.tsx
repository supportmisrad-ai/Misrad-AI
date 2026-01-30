'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSystemIconUrl } from '@/lib/metadata';

/**
 * DynamicFavicon - Updates the browser favicon based on organization logo
 * Falls back to Scale logo if no organization logo exists
 */
export const DynamicFavicon: React.FC = () => {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateFavicon = (iconUrl: string) => {
            const urlWithoutQuery = iconUrl.split('?')[0] || iconUrl;
            const type = urlWithoutQuery.toLowerCase().endsWith('.svg')
                ? 'image/svg+xml'
                : urlWithoutQuery.toLowerCase().endsWith('.png')
                  ? 'image/png'
                  : urlWithoutQuery.toLowerCase().endsWith('.ico')
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
            appleLink.href = urlWithoutQuery.startsWith('/icons/') && urlWithoutQuery.toLowerCase().endsWith('.svg')
                ? iconUrl.replace(/\.svg(\?.*)?$/i, '-192.png$1')
                : iconUrl;
        };

        const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');

        const iconByRoute = (p: string) => {
            if (/(^|\/)(app\/admin)(\/|$)/i.test(p)) return getSystemIconUrl('admin');
            if (/^\/operations(\/|$)/i.test(p) && !/(^|\/)w\/[^/]+\//i.test(p)) return getSystemIconUrl('misrad');
            if (/(^|\/)(nexus(-os)?)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/nexus(\/|$)/i.test(p)) return getSystemIconUrl('nexus');
            if (/(^|\/)(system(-os)?)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/system(\/|$)/i.test(p)) return getSystemIconUrl('system');
            if (/(^|\/)(social)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/social(\/|$)/i.test(p)) return getSystemIconUrl('social');
            if (/(^|\/)(finance)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/finance(\/|$)/i.test(p)) return getSystemIconUrl('finance');
            if (/(^|\/)(client)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/client(\/|$)/i.test(p)) return getSystemIconUrl('client');
            if (/(^|\/)(operations)(\/|$)/i.test(p) || /(^|\/)w\/[^/]+\/operations(\/|$)/i.test(p)) return getSystemIconUrl('operations');
            return getSystemIconUrl('misrad');
        };

        updateFavicon(iconByRoute(path));
    }, [pathname]);

    return null; // This component doesn't render anything
};

