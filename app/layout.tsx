import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Heebo, Inter } from "next/font/google";
import "./globals.css";
import { getSystemMetadata, getThemeColor } from '@/lib/metadata';
import { ToastProvider } from '@/contexts/ToastContext';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { ClientOnlyClerkWidgets, ClientOnlyGlobalWidgets } from './ClientOnlyWidgets';

// Heebo - Main text font (font-sans)
// Geometric modern font with excellent Hebrew/English support, critical for RTL interface
const heebo = Heebo({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

// Inter - Numbers and data font (font-mono)
// High readability on screens, used primarily for numbers, dates, and technical areas
const inter = Inter({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = getSystemMetadata();

export const viewport: Viewport = {
  themeColor: getThemeColor(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only use ClerkProvider if publishable key is available
  // This prevents build-time errors and runtime crashes when env vars are not set
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const signInUrlRaw = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/login';
  const signInUrl = signInUrlRaw.startsWith('/sign-in') ? '/login' : signInUrlRaw;
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up';
  const afterSignInUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/';
  const afterSignUpUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/';

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${heebo.variable} ${inter.variable} antialiased`} suppressHydrationWarning>
        <ToastProvider>
          <ReactQueryProvider>
          {clerkPublishableKey ? (
            <ClerkProvider
              publishableKey={clerkPublishableKey}
              signInUrl={signInUrl}
              signUpUrl={signUpUrl}
              afterSignInUrl={afterSignInUrl}
              afterSignUpUrl={afterSignUpUrl}
            >
              {children}
              <ClientOnlyClerkWidgets />
            </ClerkProvider>
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
      </body>
    </html>
  );
}
