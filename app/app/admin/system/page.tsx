import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminSystemIndexPage() {
  redirect('/app/admin/system/control');
}
