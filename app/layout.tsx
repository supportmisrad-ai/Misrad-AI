import type { Metadata, Viewport } from "next";
import { Heebo, Inter } from "next/font/google";
import { Suspense } from 'react';
import "./globals.css";
import { getSystemMetadata, getThemeColor } from '@/lib/metadata';
import { ToastProvider } from '@/contexts/ToastContext';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { ClientOnlyClerkWidgets, ClientOnlyGlobalWidgets, ClientOnlyPwaBiometricGuard } from './ClientOnlyWidgets';
import { ClerkProviderWithRouter } from './ClerkProviderWithRouter';
import { GlobalContextMenuProvider } from '@/components/shared/GlobalContextMenu';
import { UnifiedLoadingShell } from '@/components/shared/UnifiedLoadingShell';

// Heebo - Main text font (font-sans)
const heebo = Heebo({
  variable: "--font-sans",
  subsets: ["hebrew"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: ['system-ui', 'arial'],
});

// Inter - Numbers and data font (font-mono)
const inter = Inter({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ['monospace'],
});

export const metadata: Metadata = getSystemMetadata();

export const viewport: Viewport = {
  themeColor: getThemeColor(),
  viewportFit: 'cover',
};

// Loading fallback for auth widgets - appears immediately
function AuthWidgetsFallback() {
  return <UnifiedLoadingShell stage="initial" />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const signInUrlRaw = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/login';
  const signInUrl = signInUrlRaw.startsWith('/sign-in') ? '/login' : signInUrlRaw;
  const signUpUrlRaw = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/login?mode=sign-up';
  const signUpUrl = signUpUrlRaw.startsWith('/sign-up') ? '/login?mode=sign-up' : signUpUrlRaw;
  const signInFallbackRedirectUrl =
    process.env.CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ||
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ||
    '/me';
  const signUpFallbackRedirectUrl =
    process.env.CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ||
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ||
    '/me';

  return (
    <html lang="he" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${heebo.variable} ${inter.variable} antialiased bg-[#F8FAFC]`} suppressHydrationWarning>
        {/* Required by Clerk Turnstile CAPTCHA - must be in body for OAuth flows */}
        <div id="clerk-captcha" />
        <GlobalContextMenuProvider>
        <ToastProvider>
          <ReactQueryProvider>
          {clerkPublishableKey ? (
            <ClerkProviderWithRouter
              publishableKey={clerkPublishableKey}
              signInUrl={signInUrl}
              signUpUrl={signUpUrl}
              signInFallbackRedirectUrl={signInFallbackRedirectUrl}
              signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
            >
              {/* Immediate shell - no waiting for Clerk */}
              <ClientOnlyPwaBiometricGuard>
                {children}
              </ClientOnlyPwaBiometricGuard>
              {/* Auth widgets load behind Suspense */}
              <Suspense fallback={null}>
                <ClientOnlyClerkWidgets />
              </Suspense>
            </ClerkProviderWithRouter>
          ) : (
            <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
              <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="text-xl font-black text-slate-900">חסר מפתח התחברות (Clerk)</div>
                <div className="mt-3 text-sm font-bold text-slate-600">
                  כדי להפעיל את המערכת צריך להגדיר את המשתנה
                  <span className="mx-1 font-mono bg-slate-100 px-2 py-1 rounded">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span>
                  בקובץ
                  <span className="mx-1 font-mono bg-slate-100 px-2 py-1 rounded">.env.local</span>
                  ואז להפעיל מחדש את השרת.
                </div>
              </div>
            </div>
          )}

          <ClientOnlyGlobalWidgets />
          </ReactQueryProvider>
        </ToastProvider>
        </GlobalContextMenuProvider>
      </body>
    </html>
  );
}
