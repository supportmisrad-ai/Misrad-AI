import { redirect } from 'next/navigation';

// Clerk Account Portal may try to load /portal — redirect to /me
// which resolves the user's workspace or sends to login.
export default function PortalRedirectPage() {
  redirect('/me');
}
