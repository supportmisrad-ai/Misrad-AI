export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
      <div className="w-full max-w-2xl mx-auto px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative overflow-hidden w-14 h-14 rounded-2xl bg-slate-200 mb-4">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
          <div className="relative overflow-hidden w-40 h-5 rounded-lg bg-slate-200">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-5">
          <div className="relative overflow-hidden w-3/4 h-6 rounded-lg bg-slate-100">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="relative overflow-hidden h-24 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
              </div>
            ))}
          </div>
          <div className="relative overflow-hidden w-full h-12 rounded-xl bg-indigo-100">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
