import type { CapacitorConfig } from '@capacitor/cli';

const DEFAULT_PRODUCTION_URL = 'https://misrad-ai.com';

function getServerUrl(): string {
  const rawEnv = (process.env.CAP_SERVER_URL || '').trim();

  if (!rawEnv) {
    return DEFAULT_PRODUCTION_URL;
  }

  // Never point a built APK to localhost – it won't be reachable
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(rawEnv)) {
    return DEFAULT_PRODUCTION_URL;
  }

  // Ensure we always have https:// for non-localhost domains
  if (!/^https?:\/\//i.test(rawEnv)) {
    return `https://${rawEnv}`;
  }

  return rawEnv;
}

const PRODUCTION_URL = getServerUrl();

const config: CapacitorConfig = {
  appId: 'com.misrad.ai',
  appName: 'MISRAD AI',
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
