export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
      <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur px-8 py-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
        <div className="text-slate-900 font-black">מכינים את החשבון שלך…</div>
        <div className="text-sm text-slate-600 mt-2">רגע אחד</div>
      </div>
    </div>
  );
}
