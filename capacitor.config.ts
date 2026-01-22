import type { CapacitorConfig } from '@capacitor/cli';

const PRODUCTION_URL = process.env.CAP_SERVER_URL || 'https://misrad-ai.com';

const config: CapacitorConfig = {
  appId: 'com.scalecrm.app',
  appName: 'Scale CRM',
  webDir: 'public',
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
