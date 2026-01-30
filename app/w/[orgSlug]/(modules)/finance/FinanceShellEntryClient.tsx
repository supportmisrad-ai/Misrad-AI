'use client';

import React from 'react';
import FinanceShell from './FinanceShell';

export default function FinanceShellEntryClient(props: {
  children: React.ReactNode;
  initialCurrentUser?: any;
  initialOrganization?: any;
}) {
  return <FinanceShell {...props} />;
}
