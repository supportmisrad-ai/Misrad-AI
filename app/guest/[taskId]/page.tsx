'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GuestTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = typeof params?.taskId === 'string' ? params.taskId : '';
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setNotFound(true);
      return;
    }
    // For now, redirect to home with a query param that the app can pick up
    // to open the task modal in guest/read-only mode
    router.replace(`/?openTask=${encodeURIComponent(taskId)}`);
  }, [taskId, router]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center p-8">
          <h1 className="text-2xl font-black text-gray-900 mb-2">משימה לא נמצאה</h1>
          <p className="text-gray-500">הקישור שקיבלת אינו תקין או שהמשימה כבר נמחקה.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center p-8">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">טוען משימה...</p>
      </div>
    </div>
  );
}
