import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function AdminSystemIndexPage() {
  redirect('/app/admin/system/control');
}
