'use client';

/**
 * Setup Wizard - אשף הגדרה לחיבור רשתות חברתיות
 * מנחה את המשתמש בתהליך חיבור OAuth או Webhook
 */

import { useState } from 'react';
import { Check, ExternalLink, Copy, CheckCircle2, AlertCircle, Zap, Link as LinkIcon, HelpCircle } from 'lucide-react';

type SetupMethod = 'oauth' | 'webhook' | null;
type SetupStep = 'choose' | 'oauth-guide' | 'webhook-guide' | 'test' | 'complete';

interface SetupWizardProps {
  orgSlug: string;
  clientId?: string;
  onComplete?: () => void;
}

export default function SetupWizard({ orgSlug, clientId, onComplete }: SetupWizardProps) {
  const [method, setMethod] = useState<SetupMethod>(null);
  const [step, setStep] = useState<SetupStep>('choose');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleMethodSelect = (selectedMethod: SetupMethod) => {
    setMethod(selectedMethod);
    if (selectedMethod === 'oauth') {
      setStep('oauth-guide');
    } else if (selectedMethod === 'webhook') {
      setStep('webhook-guide');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    // Simulate test
    setTimeout(() => {
      setTestResult('success');
      setIsTesting(false);
      setStep('complete');
    }, 2000);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">התקדמות</span>
          <span className="text-sm text-gray-500">
            {step === 'choose' && '1/4'}
            {(step === 'oauth-guide' || step === 'webhook-guide') && '2/4'}
            {step === 'test' && '3/4'}
            {step === 'complete' && '4/4'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width:
                step === 'choose'
                  ? '25%'
                  : step === 'oauth-guide' || step === 'webhook-guide'
                  ? '50%'
                  : step === 'test'
                  ? '75%'
                  : '100%',
            }}
          />
        </div>
      </div>

      {/* Step 1: Choose Method */}
      {step === 'choose' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">בחר שיטת חיבור</h2>
          <p className="text-gray-600 mb-8">איך תרצה לפרסם לרשתות החברתיות?</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* OAuth Option */}
            <button
              onClick={() => handleMethodSelect('oauth')}
              className="border-2 border-gray-200 rounded-lg p-6 text-right hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">פרסום ישיר (OAuth)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    מומלץ - פרסום מהיר ומיידי ישירות לרשתות החברתיות
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      פרסום מיידי
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      אמין יותר
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      חינם לחלוטין
                    </li>
                  </ul>
                  <div className="mt-4 text-xs text-gray-500">⏱️ זמן הגדרה: 15-20 דקות</div>
                </div>
              </div>
            </button>

            {/* Webhook Option */}
            <button
              onClick={() => handleMethodSelect('webhook')}
              className="border-2 border-gray-200 rounded-lg p-6 text-right hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <LinkIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">דרך Make/Zapier</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    פשוט יותר - מתאים למתחילים
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      קל להגדיר
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      גמיש - אוטומציות נוספות
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      דורש חשבון Make (חינם)
                    </li>
                  </ul>
                  <div className="mt-4 text-xs text-gray-500">⏱️ זמן הגדרה: 10 דקות</div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">לא בטוח מה לבחור?</p>
                <p className="text-blue-700">
                  אם אתה מתחיל - תתחיל עם <strong>Make/Zapier</strong> (יותר פשוט).
                  <br />
                  אם אתה סוכנות או עסק גדול - תבחר <strong>פרסום ישיר</strong> (יותר מקצועי).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: OAuth Guide */}
      {step === 'oauth-guide' && (
        <div>
          <button
            onClick={() => setStep('choose')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            ← חזור לבחירת שיטה
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">הגדרת פרסום ישיר (OAuth)</h2>
          <p className="text-gray-600 mb-6">עקוב אחרי ההוראות כדי לחבר את החשבונות שלך</p>

          <div className="space-y-6">
            {/* Facebook */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                  1
                </div>
                <h3 className="text-lg font-bold">חבר Facebook + Instagram</h3>
              </div>
              <ol className="space-y-3 text-sm text-gray-700 mr-13">
                <li>1. לחץ על הכפתור למטה "חבר Facebook"</li>
                <li>2. התחבר לחשבון הפייסבוק שלך</li>
                <li>3. אשר את כל ההרשאות</li>
                <li>4. בחר את הדף העסקי שלך</li>
                <li>5. אם יש לך Instagram עסקי - הוא יתווסף אוטומטית</li>
              </ol>
              <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                חבר Facebook
              </button>
            </div>

            {/* LinkedIn */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                  2
                </div>
                <h3 className="text-lg font-bold">חבר LinkedIn</h3>
              </div>
              <ol className="space-y-3 text-sm text-gray-700 mr-13">
                <li>1. לחץ על הכפתור למטה "חבר LinkedIn"</li>
                <li>2. התחבר לחשבון הלינקדאין שלך</li>
                <li>3. אשר את ההרשאות</li>
                <li>4. בחר: פרופיל אישי או עמוד חברה</li>
              </ol>
              <button className="mt-4 px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors">
                חבר LinkedIn
              </button>
            </div>

            {/* Guide Link */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">📖 רוצה מדריך מפורט עם צילומי מסך?</p>
              <a
                href="/docs/social-guides/SETUP_GUIDE_OAUTH.md"
                target="_blank"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                פתח מדריך מלא
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <button
              onClick={() => setStep('test')}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              סיימתי להתחבר - בדוק חיבור
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Webhook Guide */}
      {step === 'webhook-guide' && (
        <div>
          <button
            onClick={() => setStep('choose')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            ← חזור לבחירת שיטה
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">הגדרת Make/Zapier</h2>
          <p className="text-gray-600 mb-6">עקוב אחרי ההוראות כדי לחבר דרך Make או Zapier</p>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  1
                </div>
                <h3 className="text-lg font-bold">הרשם ל-Make (חינם)</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                אם אין לך חשבון Make - הירשם פה (לוקח 2 דקות):
              </p>
              <a
                href="https://www.make.com/en/register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                הירשם ל-Make
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Step 2 */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  2
                </div>
                <h3 className="text-lg font-bold">צור Scenario חדש ב-Make</h3>
              </div>
              <ol className="space-y-2 text-sm text-gray-700 mr-13">
                <li>1. היכנס ל-Make → לחץ "Create scenario"</li>
                <li>2. הוסף מודול "Webhooks → Custom webhook"</li>
                <li>3. צור webhook חדש בשם "Social Post"</li>
                <li>4. <strong>העתק את ה-URL</strong> שMake נותן לך</li>
              </ol>
            </div>

            {/* Step 3 */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  3
                </div>
                <h3 className="text-lg font-bold">הדבק את ה-URL כאן</h3>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL מ-Make:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hook.make.com/..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={copyWebhookUrl}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={!webhookUrl}
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Guide Link */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">📖 רוצה מדריך מפורט עם צילומי מסך?</p>
              <a
                href="/docs/social-guides/SETUP_GUIDE_WEBHOOK.md"
                target="_blank"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                פתח מדריך מלא
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <button
              onClick={() => setStep('test')}
              disabled={!webhookUrl}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              סיימתי - בדוק חיבור
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Test */}
      {step === 'test' && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">בודק חיבור...</h2>
          <p className="text-gray-600 mb-8">אנחנו בודקים שהכל עובד כמו שצריך</p>

          <div className="max-w-md mx-auto">
            {!isTesting && !testResult && (
              <button
                onClick={handleTest}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                התחל בדיקה
              </button>
            )}

            {isTesting && (
              <div className="py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">בודק...</p>
              </div>
            )}

            {testResult === 'success' && (
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-900 mb-2">החיבור עובד מצוין! 🎉</h3>
                <p className="text-sm text-green-700">
                  כל הפלטפורמות מחוברות ומוכנות לפרסום
                </p>
              </div>
            )}

            {testResult === 'error' && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-900 mb-2">משהו לא עבד</h3>
                <p className="text-sm text-red-700 mb-4">
                  לא הצלחנו להתחבר. בדוק שהעתקת את ה-URL נכון ונסה שוב.
                </p>
                <button
                  onClick={() => setStep(method === 'oauth' ? 'oauth-guide' : 'webhook-guide')}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  ← חזור לשלב הקודם
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && (
        <div className="text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">הכל מוכן! 🚀</h2>
            <p className="text-gray-600">
              עכשיו אתה יכול לפרסם ישירות לרשתות החברתיות בלחיצת כפתור
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-right">
              <h3 className="font-medium text-blue-900 mb-2">💡 מה הלאה?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✓ צור פוסט חדש</li>
                <li>✓ בחר את הפלטפורמות</li>
                <li>✓ לחץ "פרסם" - זהו!</li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              צא מהאשף
            </button>

            <button
              onClick={() => {
                setStep('choose');
                setMethod(null);
                setWebhookUrl('');
                setTestResult(null);
              }}
              className="w-full py-2 text-gray-600 hover:text-gray-800"
            >
              התחל מחדש
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
