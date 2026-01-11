import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Heebo, Inter } from "next/font/google";
import "./globals.css";
import { PWAInstaller } from "@/components/PWAInstaller";
import { PasskeyOnboardingPrompt } from "@/components/PasskeyOnboardingPrompt";
import { getSystemMetadata, getThemeColor } from '@/lib/metadata';

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
  
  const content = (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        className={`${heebo.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <PWAInstaller />
      </body>
    </html>
  );

  const contentWithClerk = (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        className={`${heebo.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <PWAInstaller />
        <PasskeyOnboardingPrompt />
      </body>
    </html>
  );

  // Wrap with ClerkProvider only if key is available
  if (clerkPublishableKey) {
    return <ClerkProvider publishableKey={clerkPublishableKey}>{contentWithClerk}</ClerkProvider>;
  }

  // Fallback for build-time and when env vars are not available
  return content;
}
