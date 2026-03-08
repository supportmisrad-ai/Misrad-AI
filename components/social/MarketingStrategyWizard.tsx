'use client';

/**
 * Marketing Strategy Wizard
 * אשף ליצירת אסטרטגיית שיווק מותאמת אישית ללקוח
 */

import { useState } from 'react';
import { Sparkles, Target, TrendingUp, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { createMarketingStrategyAction } from '@/app/actions/marketing-strategy';
import type { ClientProfile, MarketingStrategy } from '@/lib/ai/marketing-strategy-generator';

interface MarketingStrategyWizardProps {
  orgSlug: string;
  clientId: string;
  clientName: string;
  onComplete?: (strategy: MarketingStrategy) => void;
}

export default function MarketingStrategyWizard({
  orgSlug,
  clientId,
  clientName,
  onComplete,
}: MarketingStrategyWizardProps) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<ClientProfile>({
    name: clientName,
    industry: '',
    targetAudience: '',
    goals: [],
    competitors: [],
    budget: '',
    currentChallenges: [],
  });
  const [generatedStrategy, setGeneratedStrategy] = useState<MarketingStrategy | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await createMarketingStrategyAction({
        orgSlug,
        clientId,
        profile,
      });

      if (result.success && result.strategy) {
        setGeneratedStrategy(result.strategy);
        setStep(4);
        onComplete?.(result.strategy);
      } else {
        alert(result.error || 'שגיאה ביצירת אסטרטגיה');
      }
    } catch (error) {
      alert('שגיאה ביצירת אסטרטגיה');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Sparkles className="h-8 w-8 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">אסטרטגיית שיווק מבוססת AI</h1>
        <p className="text-gray-600">נייצר עבורך תוכנית שיווקית מלאה מותאמת אישית ל{clientName}</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 mx-1 rounded-full ${
                s <= step ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>פרטי לקוח</span>
          <span>מטרות</span>
          <span>יצירה</span>
          <span>מוכן!</span>
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תחום העסק
            </label>
            <input
              type="text"
              value={profile.industry}
              onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
              placeholder="לדוגמה: מסעדה, חנות בגדים, עורך דין..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              קהל היעד
            </label>
            <textarea
              value={profile.targetAudience}
              onChange={(e) => setProfile({ ...profile, targetAudience: e.target.value })}
              placeholder="תאר את קהל היעד: גיל, מיקום, תחומי עניין..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מתחרים עיקריים (אופציונלי)
            </label>
            <input
              type="text"
              placeholder="הפרד בפסיקים: מתחרה 1, מתחרה 2..."
              onChange={(e) =>
                setProfile({ ...profile, competitors: e.target.value.split(',').map((c) => c.trim()) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!profile.industry || !profile.targetAudience}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            המשך →
          </button>
        </div>
      )}

      {/* Step 2: Goals */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              מטרות השיווק (בחר לפחות 1)
            </label>
            <div className="space-y-2">
              {[
                'הגדלת מודעות למותג',
                'יצירת לידים',
                'מכירות ישירות',
                'בניית קהילה',
                'שירות לקוחות',
                'גיוס עובדים',
              ].map((goal) => (
                <label key={goal} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.goals.includes(goal)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProfile({ ...profile, goals: [...profile.goals, goal] });
                      } else {
                        setProfile({
                          ...profile,
                          goals: profile.goals.filter((g) => g !== goal),
                        });
                      }
                    }}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span>{goal}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תקציב חודשי (אופציונלי)
            </label>
            <select
              value={profile.budget}
              onChange={(e) => setProfile({ ...profile, budget: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">לא רלוונטי</option>
              <option value="עד 1,000₪">עד 1,000₪</option>
              <option value="1,000-5,000₪">1,000-5,000₪</option>
              <option value="5,000-10,000₪">5,000-10,000₪</option>
              <option value="מעל 10,000₪">מעל 10,000₪</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              ← חזור
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={profile.goals.length === 0}
              className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300"
            >
              המשך →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generate */}
      {step === 3 && (
        <div className="text-center space-y-6">
          <div className="p-8 bg-purple-50 border border-purple-200 rounded-lg">
            <Target className="h-16 w-16 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">מוכן ליצירה!</h3>
            <p className="text-gray-600 mb-6">
              ה-AI שלנו ייצור עבורך אסטרטגיה מותאמת אישית הכוללת:
            </p>
            <ul className="text-right text-sm text-gray-700 space-y-2 max-w-md mx-auto">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                4 עמודי תוכן ראשיים
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                תוכנית תוכן חודשית (30 ימים)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Hashtags מותאמים
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                זמני פרסום מיטביים
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                KPIs למדידה
              </li>
            </ul>
          </div>

          {isGenerating ? (
            <div className="py-8">
              <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">יוצר אסטרטגיה מותאמת אישית...</p>
              <p className="text-sm text-gray-500 mt-2">זה יכול לקחת 30-60 שניות</p>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                ← חזור
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                צור אסטרטגיה
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && generatedStrategy && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">האסטרטגיה מוכנה! 🎉</h2>
            <p className="text-gray-600">תוכל לצפות ולהוריד את האסטרטגיה המלאה</p>
          </div>

          {/* Quick Preview */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4">תצוגה מקדימה:</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">סקירה:</h4>
                <p className="text-sm text-gray-600">{generatedStrategy.overview.substring(0, 200)}...</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">עמודי תוכן:</h4>
                <div className="flex flex-wrap gap-2">
                  {generatedStrategy.contentPillars.map((pillar, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {pillar.title}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Hashtags עיקריים:</h4>
                <div className="flex flex-wrap gap-2">
                  {generatedStrategy.hashtags.primary.slice(0, 5).map((tag, idx) => (
                    <span key={idx} className="text-sm text-blue-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              הדפס
            </button>
            <button
              onClick={() => {
                /* Navigate to full strategy page */
              }}
              className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
            >
              צפה באסטרטגיה המלאה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
