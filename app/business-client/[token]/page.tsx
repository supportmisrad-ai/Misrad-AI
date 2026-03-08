import { redirect } from 'next/navigation';
import { verifyBusinessClientToken } from '@/app/actions/business-client-auth';

export default async function BusinessClientAuthPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const { token } = await Promise.resolve(params);

  // Verify the magic link token
  const result = await verifyBusinessClientToken(token);

  if (!result.success || !result.data) {
    // Token invalid or expired
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border border-red-200 shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">קישור לא תקין</h1>
          <p className="text-gray-600 mb-6">
            הקישור שפג תוקפו או שאינו תקין. אנא בקש קישור חדש ממנהל המערכת.
          </p>
          <a
            href="mailto:support@misrad-ai.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            צור קשר עם תמיכה
          </a>
        </div>
      </div>
    );
  }

  // Token valid - redirect to billing portal
  redirect(`/business-client/${token}/billing`);
}
