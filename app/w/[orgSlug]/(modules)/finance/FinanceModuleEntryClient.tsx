import FinanceModuleClient from './FinanceModuleClient';

export default function FinanceModuleEntryClient(props: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialFinanceOverview?: any;
}) {
  return <FinanceModuleClient {...props} />;
}
