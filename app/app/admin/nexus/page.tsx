import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function AdminNexusIndexPage() {
  redirect('/app/admin/nexus/control');
}
