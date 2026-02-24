import { redirect } from 'next/navigation';

export const metadata = {
  title: 'ארגונים | Admin',
};

export default function AdminCustomersPage() {
  redirect('/app/admin/organizations');
}
