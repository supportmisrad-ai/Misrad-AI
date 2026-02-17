import { redirect } from 'next/navigation';

/**
 * Redirect from legacy /admin/tenants to /admin/organizations
 * @deprecated - Use /admin/organizations instead
 */
export default function AdminTenantsRedirectPage() {
  redirect('/app/admin/organizations');
}
