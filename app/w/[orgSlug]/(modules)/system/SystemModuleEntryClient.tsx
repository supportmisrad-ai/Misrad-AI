import SystemModuleClient from './SystemModuleClient';

export default function SystemModuleEntryClient(props: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialTab?: string;
}) {
  return <SystemModuleClient {...props} />;
}
