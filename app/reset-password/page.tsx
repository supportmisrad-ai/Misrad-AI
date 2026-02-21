import { auth } from "@clerk/nextjs/server";
import { ResetPasswordView } from "../../views/ResetPasswordView";
import { DataProvider } from "../../context/DataContext";
import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
// Removed force-dynamic: Next.js auto-detects dynamic from auth calls
export const runtime = 'nodejs';

export default async function ResetPasswordPage() {
  // Use server-side auth to check session state
  const { userId } = await auth();
  
  // If user is already signed in, redirect them away from reset password
  if (userId) {
    redirect('/');
  }

  return (
    <DataProvider>
      <ResetPasswordView />
    </DataProvider>
  );
}
