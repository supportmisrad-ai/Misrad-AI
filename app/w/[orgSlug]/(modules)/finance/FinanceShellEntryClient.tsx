'use client';

import React from 'react';
import FinanceShell from './FinanceShell';
import type { ComponentProps } from 'react';

export default function FinanceShellEntryClient(props: ComponentProps<typeof FinanceShell>) {
  return <FinanceShell {...props} />;
}
