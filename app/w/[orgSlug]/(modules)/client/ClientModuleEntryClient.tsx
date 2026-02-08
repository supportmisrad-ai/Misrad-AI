import type { ComponentProps } from 'react';
import ClientModuleClient from './ClientModuleClient';

export default function ClientModuleEntryClient(props: ComponentProps<typeof ClientModuleClient>) {
  return <ClientModuleClient {...props} />;
}
