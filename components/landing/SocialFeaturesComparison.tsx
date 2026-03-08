'use client';

/**
 * Social Features Comparison Table
 * טבלת השוואה מפורטת בין תוכניות Social Module
 */

import React from 'react';
import { Check, X, Infinity } from 'lucide-react';
import { SOCIAL_PRICING } from '@/lib/billing/social-pricing';
import { SocialPlan } from '@/types/social';

interface FeatureRow {
  category?: string;
  feature: string;
  free: boolean | string | number;
  solo: boolean | string | number;
  team: boolean | string | number;
  agency: boolean | string | number;
  enterprise: boolean | string | number;
}

const FEATURES: FeatureRow[] = [
  // Limits
  { category: 'מגבלות שימוש', feature: 'פוסטים לחודש', free: '10', solo: '100', team: '500', agency: '∞', enterprise: '∞' },
  { feature: 'מספר לקוחות', free: '1', solo: '1', team: '1', agency: '20', enterprise: '∞' },
  { feature: 'פלטפורמות חברתיות', free: '2', solo: '5', team: '10', agency: '∞', enterprise: '∞' },
  { feature: 'Campaigns פעילים', free: '0', solo: '3', team: '10', agency: '∞', enterprise: '∞' },

  // Core Features
  { category: 'תכונות ליבה', feature: 'פרסום ישיר לרשתות', free: false, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'תזמון פוסטים', free: true, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'ניהול לקוחות', free: false, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'לוח תוכן חודשי', free: true, solo: true, team: true, agency: true, enterprise: true },

  // AI Features
  { category: 'יכולות AI', feature: 'AI ליצירת תוכן', free: false, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'AI לכותרות וציונים', free: false, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'הצעת זמני פרסום מיטביים', free: false, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'ניתוח sentiment אוטומטי', free: false, solo: false, team: true, agency: true, enterprise: true },

  // Analytics
  { category: 'אנליטיקס ודיווח', feature: 'סטטיסטיקות בסיסיות', free: true, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'ניתוח ביצועים מתקדם', free: false, solo: false, team: true, agency: true, enterprise: true },
  { feature: 'דוחות לקוחות מותאמים', free: false, solo: false, team: false, agency: true, enterprise: true },
  { feature: 'Export נתונים', free: false, solo: true, team: true, agency: true, enterprise: true },

  // White Label & Branding
  { category: 'מיתוג והתאמה אישית', feature: 'White Label (מיתוג שלך)', free: false, solo: false, team: false, agency: true, enterprise: true },
  { feature: 'מיתוג מותאם אישית', free: false, solo: false, team: false, agency: true, enterprise: true },
  { feature: 'דומיין מותאם', free: false, solo: false, team: false, agency: false, enterprise: true },
  { feature: 'לוגו מותאם', free: false, solo: false, team: false, agency: true, enterprise: true },

  // Support
  { category: 'תמיכה ושירות', feature: 'תמיכה בעברית', free: true, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'זמן תגובה', free: '48 שעות', solo: '24 שעות', team: '12 שעות', agency: '6 שעות', enterprise: '2 שעות' },
  { feature: 'תמיכה מועדפת', free: false, solo: false, team: true, agency: true, enterprise: true },
  { feature: 'מנהל חשבון ייעודי', free: false, solo: false, team: false, agency: false, enterprise: true },

  // Advanced
  { category: 'מתקדם', feature: 'API Access (פיתוח מתקדם)', free: false, solo: false, team: false, agency: false, enterprise: true },
  { feature: 'Webhooks (אינטגרציות)', free: false, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'גיבויים אוטומטיים', free: false, solo: true, team: true, agency: true, enterprise: true },
  { feature: 'SLA מובטח', free: false, solo: false, team: false, agency: false, enterprise: true },
];

export default function SocialFeaturesComparison() {
  const plans: SocialPlan[] = ['free', 'solo', 'team', 'agency', 'enterprise'];

  const renderCell = (value: boolean | string | number) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-500 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-gray-300 mx-auto" />
      );
    }

    if (value === '∞') {
      return (
        <div className="flex items-center justify-center gap-1 text-blue-600 font-bold">
          <Infinity className="h-5 w-5" />
        </div>
      );
    }

    return <span className="text-sm font-medium text-gray-700">{value}</span>;
  };

  let currentCategory = '';

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            השוואה מפורטת
          </h2>
          <p className="text-lg text-gray-600">
            כל מה שאתה צריך לדעת על התוכניות השונות
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 min-w-[200px]">
                  תכונה
                </th>
                {plans.map((planKey) => {
                  const plan = SOCIAL_PRICING[planKey];
                  return (
                    <th
                      key={planKey}
                      className={`px-6 py-4 text-center text-sm font-semibold ${
                        plan.highlighted ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      <div className="font-bold">{plan.labelHe}</div>
                      <div className="text-xs font-normal text-gray-600 mt-1">
                        {plan.monthlyPrice > 0 ? `₪${plan.monthlyPrice}/חודש` : 'חינם'}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row, idx) => {
                const showCategory = row.category && row.category !== currentCategory;
                if (row.category) {
                  currentCategory = row.category;
                }

                return (
                  <React.Fragment key={idx}>
                    {showCategory && (
                      <tr className="bg-gray-100">
                        <td
                          colSpan={6}
                          className="px-6 py-3 text-right text-sm font-bold text-gray-900"
                        >
                          {row.category}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {renderCell(row.free)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {renderCell(row.solo)}
                      </td>
                      <td className={`px-6 py-4 text-center ${SOCIAL_PRICING.team.highlighted ? 'bg-blue-50' : ''}`}>
                        {renderCell(row.team)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {renderCell(row.agency)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {renderCell(row.enterprise)}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
            לא בטוח איזו תוכנית מתאימה לך?
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            דבר איתנו - נעזור לך לבחור
          </button>
        </div>
      </div>
    </div>
  );
}
