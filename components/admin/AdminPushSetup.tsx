'use client';

import React, { useEffect, useCallback } from 'react';

/**
 * AdminPushSetup — Silent component that registers push notifications
 * for the admin app on native platforms (Capacitor).
 * Sends the FCM token to the server for admin alerts.
 */
export default function AdminPushSetup() {
  const registerPush = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;

      const w = window as unknown as Record<string, unknown>;
      const cap = w.Capacitor as Record<string, unknown> | undefined;
      if (!cap) return;

      const isNative = typeof cap.isNativePlatform === 'function'
        && (cap.isNativePlatform as () => boolean)();
      if (!isNative) return;

      const Plugins = cap.Plugins as Record<string, unknown> | undefined;
      if (!Plugins) return;

      const PushNotifications = Plugins.PushNotifications as Record<string, (...args: unknown[]) => Promise<unknown>> | undefined;
      if (!PushNotifications) return;

      // Request permission
      if (typeof PushNotifications.requestPermissions === 'function') {
        const permResult = await PushNotifications.requestPermissions() as Record<string, unknown>;
        if (permResult?.receive !== 'granted') {
          console.warn('[AdminPush] Permission not granted:', permResult?.receive);
          return;
        }
      }

      // Register
      if (typeof PushNotifications.register === 'function') {
        await PushNotifications.register();
      }

      // Listen for registration token
      if (typeof PushNotifications.addListener === 'function') {
        await PushNotifications.addListener('registration', async (tokenData: unknown) => {
          const token = (tokenData as Record<string, unknown>)?.value as string | undefined;
          if (!token) return;

          console.log('[AdminPush] FCM token received, registering with server...');

          try {
            const res = await fetch('/api/admin/push/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, platform: 'android' }),
            });
            if (!res.ok) {
              console.error('[AdminPush] Server registration failed:', res.status);
            } else {
              console.log('[AdminPush] Server registration successful');
            }
          } catch (err) {
            console.error('[AdminPush] Server registration error:', err);
          }
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error: unknown) => {
          console.error('[AdminPush] Registration error:', error);
        });

        // Listen for push notifications received while app is open
        await PushNotifications.addListener('pushNotificationReceived', (notification: unknown) => {
          console.log('[AdminPush] Notification received:', notification);
        });

        // Listen for push notification action (tap)
        await PushNotifications.addListener('pushNotificationActionPerformed', (action: unknown) => {
          console.log('[AdminPush] Notification action:', action);
          // Could navigate to specific admin page based on notification data
        });
      }
    } catch (err) {
      console.error('[AdminPush] Setup error:', err);
    }
  }, []);

  useEffect(() => {
    registerPush();
  }, [registerPush]);

  // This component renders nothing — it's a side-effect only component
  return null;
}
