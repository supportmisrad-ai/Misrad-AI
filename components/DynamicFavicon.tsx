'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useData } from '@/context/DataContext';

/**
 * DynamicFavicon - Updates the browser favicon based on organization logo
 * Falls back to Scale logo if no organization logo exists
 */
export const DynamicFavicon: React.FC = () => {
    const { organization } = useData();
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
        const isNexus = /(^|\/)nexus(-os)?(\/|$)/i.test(path) || /(^|\/)w\/[^/]+\/nexus(\/|$)/i.test(path);

        updateFavicon(isNexus ? '/icons/nexus-icon.svg' : '/icons/misrad-icon.svg');
    }, [pathname]);

    return null; // This component doesn't render anything
};

