'use client';

/**
 * Plan Target Audience Section
 * מי בדיוק מתאים לכל תוכנית - הבהרה ברורה של קהל היעד
 */

import { Users, Zap, Building2, Crown } from 'lucide-react';

export default function PlanTargetAudience() {
  const audiences = [
    {
      icon: Zap,
      plan: 'Solo',
      price: '₪149/חודש',
      color: 'orange',
      title: 'למי זה מתאים?',
      items: [
        'פרילנסרים שמנהלים את הסושיאל שלהם',
        'בעלי עסקים קטנים (1 עסק)',
        'יועצי שיווק בודדים',
        'מנהלי תוכן עצמאיים',
      ],
    },
    {
      icon: Users,
      plan: 'Team',
      price: '₪299/חודש',
      color: 'blue',
      title: 'למי זה מתאים?',
      items: [
        'צוותי שיווק פנימיים בחברות',
        '2-10 אנשי שיווק',
        'ארגון אחד עם מותגים מרובים',
        'חברות בגודל בינוני',
      ],
    },
    {
      icon: Building2,
      plan: 'Agency',
      price: '₪999/חודש',
      color: 'purple',
      title: 'למי זה מתאים?',
      items: [
        'סוכנויות שיווק שמנהלות לקוחות',
        '5-20 לקוחות חיצוניים',
        'White Label (מיתוג של הסוכנות)',
        'Portal ללקוחות לאישור תוכן',
      ],
    },
    {
      icon: Crown,
      plan: 'Enterprise',
      price: 'Custom',
      color: 'green',
      title: 'למי זה מתאים?',
      items: [
        'ארגונים גדולים (20+ לקוחות)',
        'רשתות פרנצ\'יז',
        'צרכים מיוחדים (API, SLA)',
        'מנהל חשבון ייעודי',
      ],
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'orange':
        return 'bg-orange-100 text-orange-600';
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            איזו תוכנית מתאימה לך?
          </h2>
          <p className="text-lg text-gray-600">
            הגדרה ברורה של קהל היעד לכל תוכנית
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((audience) => {
            const Icon = audience.icon;
            return (
              <div
                key={audience.plan}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(audience.color)}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{audience.plan}</h3>
                    <p className="text-sm text-gray-500">{audience.price}</p>
                  </div>
                </div>

                <h4 className="font-semibold text-gray-700 mb-3">{audience.title}</h4>
                <ul className="space-y-2">
                  {audience.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">
            לא בטוח איזו תוכנית מתאימה לך?{' '}
            <a href="https://misrad-ai.com/contact" className="text-blue-600 hover:underline font-medium">
              צור קשר ונעזור לך לבחור
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
