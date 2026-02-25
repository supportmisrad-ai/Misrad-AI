export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
      <div className="w-full max-w-lg mx-auto px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative overflow-hidden w-14 h-14 rounded-2xl bg-slate-200 mb-4">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
          <div className="relative overflow-hidden w-48 h-5 rounded-lg bg-slate-200 mb-2">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
          <div className="relative overflow-hidden w-32 h-4 rounded-lg bg-slate-100">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <div className="relative overflow-hidden w-full h-11 rounded-xl bg-slate-100">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
          <div className="relative overflow-hidden w-full h-11 rounded-xl bg-slate-100">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
          <div className="relative overflow-hidden w-full h-11 rounded-xl bg-slate-100">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
          <div className="relative overflow-hidden w-full h-12 rounded-xl bg-indigo-100">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
