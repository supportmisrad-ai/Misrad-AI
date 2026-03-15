'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, Users, Gift, TrendingUp, CheckCircle, 
  Phone, Mail, User, ArrowRight, Sparkles, Share2 
} from 'lucide-react';

export default function PartnersLandingClient() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/webhooks/blaster', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'partner_signup',
          phone: formData.phone,
          name: formData.name,
          email: formData.email,
          source: formData.source || 'partners_page',
        }),
      });

      const data = await res.json();
      
      if (data.ok && data.referralCode) {
        setReferralCode(data.referralCode);
        setSubmitted(true);
      } else {
        setError(data.error || 'שגיאה בהרשמה');
      }
    } catch (err) {
      setError('שגיאה בשליחת הטופס');
    } finally {
      setLoading(false);
    }
  };

  if (submitted && referralCode) {
    const shareLink = `https://misrad-ai.com/?ref=${referralCode}`;
    const whatsappText = encodeURIComponent(`היי! רציתי להמליץ לך על MISRAD AI - מערכת ניהול עסקי מדהימה.\n\n🎁 אם תירשם דרך הלינק שלי תקבל הנחה מיוחדת!\n\n${shareLink}`);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            
            <h1 className="text-3xl font-bold mb-4">נרשמת בהצלחה! 🎉</h1>
            <p className="text-slate-300 mb-8">הקוד האישי שלך מוכן. שתף אותו והתחל להרוויח!</p>

            <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">הקוד שלך:</p>
              <p className="text-4xl font-mono font-bold text-indigo-400 mb-4">{referralCode}</p>
              
              <p className="text-sm text-slate-400 mb-2">הלינק שלך לשיתוף:</p>
              <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-slate-300 outline-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(shareLink)}
                  className="px-3 py-1 bg-indigo-600 rounded text-sm hover:bg-indigo-500"
                >
                  העתק
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 rounded-xl hover:bg-green-500 transition"
              >
                <Share2 className="w-5 h-5" />
                שתף בוואטסאפ
              </a>
              
              <button
                onClick={() => navigator.clipboard.writeText(shareLink)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
                העתק לינק
              </button>
            </div>

            <div className="mt-8 p-4 bg-indigo-900/30 rounded-xl border border-indigo-800">
              <p className="text-sm text-indigo-300">
                <strong>טיפ:</strong> שתף בקבוצות וואטסאפ של עצמאים, קהילות יזמים, ועם חברים עם עסקים. כל הרשמה דרך הלינק שלך = עמלה!
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900/50 rounded-full text-indigo-300 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            קמפיין השקה - מקומות מוגבלים
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            הרוויחו כסף כשותפים שלנו 💰
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            10% עמלה על כל לקוח + בונוסים על ביצועים + ערכת שיווק מוכנה
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-4 mb-12"
        >
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <DollarSign className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="font-bold mb-2">10% עמלה</h3>
            <p className="text-sm text-slate-400">על כל תשלום של לקוח שהבאת, לכל החיים</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <Gift className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-bold mb-2">בונוסים</h3>
            <p className="text-sm text-slate-400">בונוס הרשמה, בונוס חודשי, תחרויות והפתעות</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <TrendingUp className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="font-bold mb-2">הכנסה פסיבית</h3>
            <p className="text-sm text-slate-400">בלי לעבוד, רק לשתף לינק. פוטנציאל 1000-5000₪/חודש</p>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/30 rounded-2xl p-6 mb-12 border border-slate-700"
        >
          <h2 className="text-xl font-bold mb-6 text-center">איך זה עובד?</h2>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">1</div>
              <p className="text-sm">נרשמים כאן</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">2</div>
              <p className="text-sm">מקבלים לינק אישי</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">3</div>
              <p className="text-sm">משתפים עם חברים</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">4</div>
              <p className="text-sm">מרוויחים עמלה!</p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-6 text-center">הרשמה כשותף</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">שם מלא *</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 rounded-lg pr-10 pl-4 py-3 border border-slate-700 focus:border-indigo-500 outline-none"
                    placeholder="ישראל ישראלי"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">טלפון *</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-900 rounded-lg pr-10 pl-4 py-3 border border-slate-700 focus:border-indigo-500 outline-none"
                    placeholder="050-1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">אימייל</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-900 rounded-lg pr-10 pl-4 py-3 border border-slate-700 focus:border-indigo-500 outline-none"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {loading ? 'שולח...' : 'הירשם עכשיו'}
              </button>
            </form>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <h2 className="text-xl font-bold mb-6 text-center">שאלות נפוצות</h2>
          
          <div className="space-y-3">
            <details className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
              <summary className="cursor-pointer font-medium">כמה אפשר להרוויח?</summary>
              <p className="mt-2 text-slate-400 text-sm">תלוי בכמות הלקוחות. דוגמה: 10 לקוחות עם חבילת Empire (499₪) = ~500₪/חודש. עם בונוסים זה יכול להגיע ל-1000-2500₪/חודש.</p>
            </details>
            
            <details className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
              <summary className="cursor-pointer font-medium">מתי מקבלים את הכסף?</summary>
              <p className="mt-2 text-slate-400 text-sm">העמלות נצברות בחשבון שלך ומשולמות בתחילת כל חודש דרך העברה בנקאית או PayPal.</p>
            </details>
            
            <details className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
              <summary className="cursor-pointer font-medium">האם צריך להשתמש במערכת?</summary>
              <p className="mt-2 text-slate-400 text-sm">לא! אפשר להיות שותף בלי להשתמש. רק לשתף את הלינק ולהרוויח.</p>
            </details>
            
            <details className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
              <summary className="cursor-pointer font-medium">איך אני יודע שמישהו נרשם דרכי?</summary>
              <p className="mt-2 text-slate-400 text-sm">כל לינק מכיל את הקוד האישי שלך. נשלח לך עדכון כשמישהו נרשם דרכך.</p>
            </details>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
