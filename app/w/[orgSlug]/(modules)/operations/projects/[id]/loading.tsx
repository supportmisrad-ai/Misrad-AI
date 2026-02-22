export default function OperationsProjectDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 animate-pulse">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="h-5 w-48 bg-slate-200 rounded-lg" />
          <div className="h-3 w-32 bg-slate-100 rounded mt-2" />
        </div>
        <div className="p-5 grid grid-cols-3 gap-3">
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="h-5 w-40 bg-slate-200 rounded-lg" />
        </div>
        <div className="p-5 space-y-3">
          <div className="h-14 bg-slate-100 rounded-xl" />
          <div className="h-14 bg-slate-100 rounded-xl" />
          <div className="h-14 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
