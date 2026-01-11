import { auth } from "@clerk/nextjs/server";
import { DataProvider } from "../../context/DataContext";
import LoginPageClient from './LoginPageClient';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Use server-side auth to check session state
  const { userId } = await auth();
  
  return (
    <DataProvider>
      <LoginPageClient initialUserId={userId} />
    </DataProvider>
  );
}
