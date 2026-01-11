'use client';

import React from 'react';
import App from './App';

export type ClientOSUserData = {
  clerkUserId?: string | null;
  organizationId?: string | null;
  organization?: {
    id: string;
    name: string;
    logo?: string | null;
    has_client?: boolean | null;
  } | null;
  identity?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    role?: string | null;
  } | null;
} | null;

export default function ClientOSApp({ userData }: { userData: ClientOSUserData }) {
  return <App userData={userData} />;
}
