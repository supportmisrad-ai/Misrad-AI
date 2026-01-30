import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminClientIndexPage() {
  redirect('/app/admin/client/support');
}
