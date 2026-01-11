import { redirect } from 'next/navigation';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
export const dynamic = 'force-dynamic';

export default async function SystemOSPage() {
  redirect('/');
}
