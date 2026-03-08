export default function ExpiredTokenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-amber-200 shadow-lg p-8 text-center max-w-md">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">תוקף הקישור פג</h1>
        <p className="text-gray-600 mb-6">
          לצורך אבטחה, קישורי הגישה תקפים ל-7 ימים בלבד. אנא בקש קישור חדש ממנהל המערכת.
        </p>
        <a
          href="mailto:support@misrad-ai.com"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          בקש קישור חדש
        </a>
      </div>
    </div>
  );
}
