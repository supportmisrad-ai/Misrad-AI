export default function WorkspacesLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
      <div className="w-full max-w-lg mx-auto px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative overflow-hidden w-14 h-14 rounded-2xl bg-slate-200 mb-4">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
          <div className="relative overflow-hidden w-40 h-5 rounded-lg bg-slate-200 mb-2">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
              <div className="relative overflow-hidden w-12 h-12 rounded-xl bg-slate-100 shrink-0">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="relative overflow-hidden w-3/4 h-4 rounded-md bg-slate-100">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                </div>
                <div className="relative overflow-hidden w-1/2 h-3 rounded-md bg-slate-50">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
