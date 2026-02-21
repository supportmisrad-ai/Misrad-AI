import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function AdminClientIndexPage() {
  redirect('/app/admin/client/support');
}
