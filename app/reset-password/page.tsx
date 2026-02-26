import { auth } from "@clerk/nextjs/server";
import { ResetPasswordView } from "../../views/ResetPasswordView";
import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
// Removed force-dynamic: Next.js auto-detects dynamic from auth calls
export const runtime = 'nodejs';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; email?: string }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;
  
  // Allow signed-in users to access reset-password if coming from passkey setup
  // (OAuth users need to set a password before enabling biometric)
  if (userId && params.source !== 'passkey') {
    redirect('/');
  }

  return <ResetPasswordView />;
}
