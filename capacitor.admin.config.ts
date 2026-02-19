import type { CapacitorConfig } from '@capacitor/cli';

const PRODUCTION_URL = process.env.CAP_ADMIN_SERVER_URL || 'https://www.misrad-ai.com/app/admin';

const config: CapacitorConfig = {
  appId: 'com.misrad.ai.admin',
  appName: 'MISRAD AI Admin',
  webDir: 'public',
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    BiometricAuth: {
      reason: 'נדרש אימות זהות לגישה לפאנל ניהול',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#0F172A',
      sound: 'admin_alert.wav',
    },
  },
};

export default config;
