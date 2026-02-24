'use client';

import dynamic from 'next/dynamic';

const NativeAppUpdatePrompt = dynamic(
  () => import('@/components/system/NativeAppUpdatePrompt').then((m) => m.NativeAppUpdatePrompt),
  { ssr: false, loading: () => null }
);

export default function AdminNativeUpdatePrompt() {
  return <NativeAppUpdatePrompt />;
}
