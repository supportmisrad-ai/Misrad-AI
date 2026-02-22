import { redirect } from 'next/navigation';

/**
 * Redirect from /admin/system-flags to /admin/global/control
 * Both pages rendered the same SystemControlPanel – consolidated to avoid duplication.
 */
export default function AdminSystemFlagsRedirectPage() {
  redirect('/app/admin/global/control');
}
