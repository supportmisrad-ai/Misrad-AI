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
    // Allow navigation within misrad-ai.com subdomain (clerk, cdn, etc.)
    allowNavigation: ['*.misrad-ai.com', '*.clerk.com', '*.clerk.dev', '*.clerk.accounts.dev'],
    // Use https scheme so cookies (Clerk session) are treated as secure-origin cookies
    // and persist correctly across WebView sessions without re-auth on every open.
    androidScheme: 'https',
    iosScheme: 'https',
    // Stable hostname so the WebView uses a consistent origin for cookie storage.
    // Without this, Android WebView may generate a random origin per session,
    // causing Clerk to not recognize the stored session token → forced re-login.
    hostname: 'app.misrad-ai.com',
  },
  android: {
    allowMixedContent: false,
    // Show white background immediately (matches app bg) to avoid flash
    backgroundColor: '#F8FAFC',
    // Capture WebView back-button to prevent accidental app exit mid-flow
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#F8FAFC',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
