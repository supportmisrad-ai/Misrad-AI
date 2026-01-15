import ClientModuleClient from './ClientModuleClient';

export default function ClientModuleEntryClient(props: {
  userData: any;
  initialCurrentUser?: any;
  initialOrganization?: any;
}) {
  return <ClientModuleClient {...props} />;
}
