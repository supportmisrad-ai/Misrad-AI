import { verifyBusinessClientToken } from '@/app/actions/business-client-auth';
import { getBusinessClientInvoices } from '@/app/actions/business-client-billing';
import { BusinessClientBillingPortal } from '@/components/business-client/BusinessClientBillingPortal';
import { redirect } from 'next/navigation';

export default async function BusinessClientBillingPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const { token } = await Promise.resolve(params);

  // Verify token
  const authResult = await verifyBusinessClientToken(token);
  if (!authResult.success || !authResult.data) {
    redirect('/business-client/expired');
  }

  const { businessClientId, businessClientName, organizationName } = authResult.data;

  // Fetch invoices
  const invoicesResult = await getBusinessClientInvoices(businessClientId);

  return (
    <BusinessClientBillingPortal
      businessClientId={businessClientId}
      businessClientName={businessClientName}
      organizationName={organizationName}
      invoices={invoicesResult.success ? invoicesResult.data : []}
      token={token}
    />
  );
}
