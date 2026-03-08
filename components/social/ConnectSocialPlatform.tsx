'use client';

/**
 * Connect Social Platform Button
 * OAuth connection flow for Facebook, Instagram, LinkedIn
 */

import { useState } from 'react';
import { Facebook, Instagram, Linkedin, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export interface ConnectedPlatform {
  platform: string;
  platformPageName?: string;
  isActive: boolean;
  expiresAt?: Date | null;
}

interface ConnectSocialPlatformProps {
  clientId: string;
  connectedPlatforms?: ConnectedPlatform[];
  onConnect?: () => void;
}

const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    description: 'חבר את דף הפייסבוק שלך',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    description: 'חבר חשבון עסקי באינסטגרם',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    description: 'חבר פרופיל LinkedIn',
  },
];

export default function ConnectSocialPlatform({
  clientId,
  connectedPlatforms = [],
  onConnect,
}: ConnectSocialPlatformProps) {
  const { orgSlug, addToast } = useApp();
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);

    try {
      const returnUrl = window.location.pathname;
      const connectUrl = `/api/oauth/connect?platform=${platformId}&clientId=${clientId}&orgSlug=${orgSlug}&returnUrl=${encodeURIComponent(returnUrl)}`;
      
      // Open OAuth flow in same window
      window.location.href = connectUrl;
    } catch (error) {
      addToast(`שגיאה בחיבור ${platformId}`, 'error');
      setConnecting(null);
    }
  };

  const isConnected = (platformId: string) => {
    return connectedPlatforms.some(
      (cp) => cp.platform === platformId && cp.isActive
    );
  };

  const getConnectionInfo = (platformId: string) => {
    return connectedPlatforms.find(
      (cp) => cp.platform === platformId && cp.isActive
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">חיבור רשתות חברתיות</h3>
      <p className="text-sm text-muted-foreground">
        חבר את החשבונות שלך כדי לפרסם ישירות מהמערכת
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connected = isConnected(platform.id);
          const info = getConnectionInfo(platform.id);
          const Icon = platform.icon;

          return (
            <div
              key={platform.id}
              className="relative rounded-lg border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div
                  className="rounded-lg p-2"
                  style={{ backgroundColor: `${platform.color}15` }}
                >
                  <Icon
                    className="h-6 w-6"
                    style={{ color: platform.color }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{platform.name}</h4>
                    {connected && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {platform.description}
                  </p>

                  {connected && info?.platformPageName && (
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      מחובר: {info.platformPageName}
                    </p>
                  )}

                  {connected && info?.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      פג תוקף: {new Date(info.expiresAt).toLocaleDateString('he-IL')}
                    </p>
                  )}

                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    className={`mt-3 w-full px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                      connected
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: connected ? undefined : platform.color,
                    }}
                  >
                    {connecting === platform.id
                      ? 'מחבר...'
                      : connected
                      ? 'חבר מחדש'
                      : 'חבר עכשיו'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mt-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">איך זה עובד?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>לחץ על "חבר עכשיו" כדי להתחבר לחשבון שלך</li>
              <li>אשר הרשאות לפרסום (חד פעמי)</li>
              <li>מעכשיו כל פוסט יתפרסם ישירות ללא צורך ב-Make/Zapier</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
