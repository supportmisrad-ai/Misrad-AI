import { redirect } from 'next/navigation';

/**
 * @deprecated Redirects to /admin/organizations
 */
export default function AdminCustomersPage() {
  redirect('/app/admin/organizations');
}
