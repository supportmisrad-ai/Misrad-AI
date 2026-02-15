export default function WorkspacesLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-slate-200 border-t-slate-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">טוען סביבות עבודה...</p>
      </div>
    </div>
  );
}
