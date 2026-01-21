import React from 'react';

export const dynamic = 'force-dynamic';

export default async function AdminAIPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-black text-slate-900">AI</div>
        <div className="text-sm font-bold text-slate-500 mt-1">גשר פקודות (בקרוב)</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="text-slate-900 font-black">בנייה</div>
        <div className="text-sm text-slate-600 mt-2">העמוד הזה יכיל שליטה על פעולות AI / Bridge וסטטוסים.</div>
      </div>
    </div>
  );
}
