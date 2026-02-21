import { redirect } from 'next/navigation';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function CheckoutSuccessPage() {
  redirect('/subscribe/checkout');
}
