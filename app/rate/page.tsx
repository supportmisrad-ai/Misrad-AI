import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import RatePageClient from './RatePageClient';

export default async function RatePage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; rating?: string }>;
}) {
  const clerk = await currentUser();
  if (!clerk?.id) {
    const params = await searchParams;
    const orgParam = params?.org || '';
    const ratingParam = params?.rating || '';
    redirect(`/login?redirect=/rate?org=${encodeURIComponent(orgParam)}&rating=${encodeURIComponent(ratingParam)}`);
  }

  const params = await searchParams;
  const orgId = params?.org || '';
  const initialRating = Number(params?.rating) || 0;

  return <RatePageClient organizationId={orgId} initialRating={initialRating} />;
}
