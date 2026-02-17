import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SetupCustomerWizard from '@/components/admin/SetupCustomerWizard';

export const metadata = {
  title: 'הקמת לקוח חדש | Admin',
  description: 'Wizard להקמת לקוח עסקי חדש עם ארגון ומנהל מערכת',
};

export default async function SetupCustomerPage() {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">הקמת לקוח חדש</h1>
        <p className="text-gray-600">
          Wizard מקיף להקמת לקוח עסקי, ארגון, חבילת מנוי ומנהל מערכת בפעולה אחת
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-black text-blue-900 mb-2">💡 איך זה עובד?</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>✓ <strong>שלב 1:</strong> הזן פרטי החברה המשלמת (שם, ח.פ, כתובת)</li>
          <li>✓ <strong>שלב 2:</strong> הגדר את הארגון (שם, סלאג, לוגו)</li>
          <li>✓ <strong>שלב 3:</strong> בחר חבילת מנוי ומודולים פעילים</li>
          <li>✓ <strong>שלב 4:</strong> הוסף את המנהל שיהיה בעלים של הארגון</li>
        </ul>
        <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">
            <strong>שים לב:</strong> כל הפעולות מבוצעות בטרנזקציה אטומית אחת. אם אחד השלבים נכשל, שום דבר לא ישמר במערכת.
          </p>
        </div>
      </div>

      {/* Wizard */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <SetupCustomerWizard />
      </Suspense>
    </div>
  );
}
