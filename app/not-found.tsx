import Link from 'next/link';
import { ArrowRight, Home, Search, Sparkles, Brain, Zap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        {/* AI Icon Animation */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <Brain className="w-24 h-24 text-blue-600 relative animate-bounce" />
            <Sparkles className="w-8 h-8 text-purple-600 absolute -top-2 -right-2 animate-spin" />
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-7xl font-bold text-gray-900 mb-4">
          404
        </h1>
        
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          ה-AI שלנו חיפש בכל מקום... 🤔
        </h2>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
          <p className="text-xl text-gray-700 mb-4">
            <span className="font-semibold text-blue-600">MISRAD AI</span> בדיקת רגע זה בדק:
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-600">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span>75,000 מסמכים</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Search className="w-5 h-5 text-green-500" />
              <span>234 צ'אטים פעילים</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Brain className="w-5 h-5 text-purple-500" />
              <span>1,247 תהליכים</span>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-lg mb-6">
            <p className="text-gray-700 font-medium">
              הדף שחיפשת לא נמצא, אבל ה-AI שלנו <span className="text-blue-600">כן מצא</span> את כל הדרכים 
              לעזור לך לנהל את הארגון שלך בצורה חכמה יותר 🚀
            </p>
          </div>

          <p className="text-gray-600 italic">
            "בניגוד לדף הזה, הלקוחות שלך לא צריכים להיעלם. 
            <br />
            MISRAD AI מזהה בזמן אמת מתי לקוח בסיכון ומה לעשות בדיוק."
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Home className="w-5 h-5" />
            חזרה לדף הבית
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link 
            href="/pricing"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-all border-2 border-blue-600 hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            גלה איך AI מנהל את הארגון
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-4 font-medium">אולי חיפשת את אחד מהמודולים שלנו?</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/me" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              Nexus OS
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/me" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              Social
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/me" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              Client
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/me" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              Finance OS
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/me" className="text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              Operations OS
            </Link>
          </div>
        </div>

        {/* Brand Message */}
        <div className="mt-8 text-sm text-gray-500">
          <p>MISRAD AI - מערכת AI שמנהלת את הארגון שלך 🚀</p>
        </div>
      </div>
    </div>
  );
}
