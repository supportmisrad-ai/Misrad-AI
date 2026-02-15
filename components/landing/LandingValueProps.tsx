import { Target, Users, TrendingUp } from 'lucide-react';

export function LandingValueProps() {
  return (
    <section id="comparison" className="py-20 sm:py-28 bg-white relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">למה MISRAD?</h2>
          <p className="mt-4 text-lg text-slate-600">תוצאות אמיתיות, לא רק features.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: 'חוסכים 10 שעות שבועיות', desc: 'תפסיקו לבזבז זמן על טלפונים וחיפושים באקסלים.', gradient: 'from-cyan-500 to-blue-600' },
            { icon: Users, title: 'לקוחות מרוצים', desc: 'עדכונים אוטומטיים בווצאפ - הלקוח תמיד יודע מה קורה.', gradient: 'from-purple-500 to-indigo-600' },
            { icon: TrendingUp, title: 'יותר רווח', desc: 'לא מפספסים קריאות. כל עבודה מתועדת ומתומחרת.', gradient: 'from-amber-500 to-orange-600' },
          ].map((x) => (
            <div key={x.title} className="group rounded-3xl bg-white border border-slate-200 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${x.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <x.icon size={24} />
              </div>
              <div className="mt-6 text-xl font-black text-slate-900">{x.title}</div>
              <div className="mt-3 text-slate-600 leading-relaxed">{x.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
