import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/server/authHelper';
import LandingContentClient from './LandingContentClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function LandingContentPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  // TODO: בדיקת הרשאות אדמין
  // const isAdmin = await checkIfUserIsAdmin(userId);
  // if (!isAdmin) redirect('/');

  return <LandingContentClient />;
}
