export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-[3px] border-slate-200 border-t-slate-700 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">מתחבר...</p>
      </div>
    </div>
  );
}
