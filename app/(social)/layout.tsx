import React from 'react';
import { Metadata } from 'next';
import { getSystemMetadata } from '@/lib/metadata';

// Force dynamic rendering as Social OS depends on authentication and organization context
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  ...getSystemMetadata('social'),
  icons: {
    icon: [
      { url: '/icons/social-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/icon-192.png',
    shortcut: '/icons/social-icon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'theme-color': '#3B82F6',
  },
};

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
