import type { ComponentProps } from 'react';
import FinanceModuleClient from './FinanceModuleClient';

export default function FinanceModuleEntryClient(props: ComponentProps<typeof FinanceModuleClient>) {
  return <FinanceModuleClient {...props} />;
}
