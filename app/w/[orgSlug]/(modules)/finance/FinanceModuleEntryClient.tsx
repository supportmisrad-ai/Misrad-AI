import type { ReactNode } from 'react';
import FinanceModuleClient from './FinanceModuleClient';

export default function FinanceModuleEntryClient(props: {
  children: ReactNode;
  initialCurrentUser?: any;
  initialOrganization?: any;
}) {
  return <FinanceModuleClient {...props} />;
}
