import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function CheckoutSuccessPage() {
  redirect('/subscribe/checkout');
}
