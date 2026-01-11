
import React, { useState } from 'react';
import { Loader2, ArrowLeft, Lock, ChevronLeft, Star, Shield, Zap, CheckCircle2, Menu } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full bg-nexus-bg font-sans text-nexus-primary overflow-x-hidden selection:bg-nexus-accent selection:text-white">
      
      {/* 1. FIXED TOP NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-nexus-primary text-white flex items-center justify-center font-display font-bold text-lg rounded-lg shadow-glow-gold">C</div>
             <span className="font-display font-bold text-lg tracking-tight">Client</span>
          </div>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden">
              <Menu size={24} />
          </button>
          <div className="hidden md:flex gap-4">
              <button onClick={() => setShowLoginForm(true)} className="text-sm font-bold text-gray-600 hover:text-nexus-primary">כניסה</button>
              <button className="text-sm font-bold bg-nexus-primary text-white px-4 py-2 rounded-lg hover:bg-nexus-accent transition-colors">התחל חינם</button>
          </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="pt-32 pb-16 px-6 md:px-0 relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-nexus-accent/5 rounded-full blur-3xl -z-10"></div>
         
         <div className="max-w-3xl mx-auto flex flex-col items-center text-center relative z-10">
             
             {/* Small Tag */}
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm mb-6 animate-fade-in">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Misrad v5.0 Live</span>
             </div>

             {/* Big Central Title */}
             <h1 className="text-5xl md:text-7xl font-display font-black text-nexus-primary leading-[1.1] mb-6 tracking-tight animate-slide-up">
                 ניהול לקוחות.<br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-nexus-primary via-nexus-accent to-nexus-primary bg-300% animate-shimmer">
                     אבל אחרת.
                 </span>
             </h1>

             {/* Paragraphs */}
             <div className="space-y-4 max-w-xl mx-auto text-gray-600 text-lg md:text-xl font-light mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                 <p>
                     המערכת שחוסכת לך זמן יקר, מנתחת שיחות באופן אוטומטי ומנהלת את קשרי הלקוחות שלך בחוכמה ובאלגנטיות.
                 </p>
                 <p className="hidden md:block">
                     תפסיק לעבוד קשה ותתחיל לעבוד חכם עם המערכת המתקדמת בעולם לניהול סוכנויות B2B.
                 </p>
             </div>

             {/* Buttons (Stacked on Mobile) */}
             <div className="flex flex-col md:flex-row gap-4 w-full max-w-sm md:max-w-md animate-slide-up" style={{ animationDelay: '0.2s' }}>
                 <button 
                    onClick={() => setShowLoginForm(true)}
                    className="w-full py-4 bg-nexus-primary text-white rounded-xl font-bold text-lg shadow-xl shadow-nexus-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                 >
                     כניסה למערכת <ChevronLeft size={20} />
                 </button>
                 <button className="w-full py-4 bg-white text-nexus-primary border border-gray-200 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors">
                     בקש הדגמה
                 </button>
             </div>

             {/* 3 Small Tags */}
             <div className="flex items-center justify-center gap-4 mt-8 md:mt-10 text-xs font-medium text-gray-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                 <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                     <Zap size={14} className="text-nexus-accent" fill="currentColor" /> AI Powered
                 </div>
                 <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                     <Shield size={14} className="text-nexus-primary" /> Enterprise Security
                 </div>
                 <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                     <Star size={14} className="text-yellow-500" fill="currentColor" /> Top Rated
                 </div>
             </div>

             {/* Image / Animation at bottom */}
             <div className="mt-12 md:mt-16 w-full max-w-4xl relative animate-slide-up" style={{ animationDelay: '0.4s' }}>
                 <div className="absolute inset-0 bg-gradient-to-t from-nexus-bg to-transparent z-10 h-20 bottom-0"></div>
                 <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-2 md:p-4 overflow-hidden transform perspective-1000 rotate-x-12 scale-95 opacity-90">
                     {/* Abstract UI Representation */}
                     <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-12 gap-4 aspect-[16/9]">
                         <div className="col-span-3 bg-white rounded-lg shadow-sm"></div>
                         <div className="col-span-9 grid grid-rows-3 gap-4">
                             <div className="bg-white rounded-lg shadow-sm row-span-1 flex items-center gap-4 px-4">
                                 <div className="w-10 h-10 rounded-full bg-gray-100"></div>
                                 <div className="h-4 w-32 bg-gray-100 rounded"></div>
                             </div>
                             <div className="bg-white rounded-lg shadow-sm row-span-2 grid grid-cols-2 gap-4 p-4">
                                 <div className="bg-nexus-primary/5 rounded border border-nexus-primary/10"></div>
                                 <div className="bg-gray-100 rounded"></div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      </section>

      {/* 3. COMPANY LOGOS STRIP */}
      <section className="py-10 border-y border-gray-200 bg-white">
          <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">אין נתונים להצגה</p>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-center text-gray-400 text-xs">
          <p>© {new Date().getFullYear()} Misrad. כל הזכויות שמורות.</p>
      </footer>


      {/* --- LOGIN FORM MODAL --- */}
      {showLoginForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-nexus-primary/20 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-[400px] p-8 rounded-3xl shadow-2xl relative animate-slide-up">
                  <button 
                      onClick={() => setShowLoginForm(false)}
                      className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                  >
                      <ArrowLeft size={20} />
                  </button>

                  <div className="text-center mb-8">
                      <div className="w-12 h-12 mx-auto bg-nexus-primary text-white flex items-center justify-center font-display font-bold text-2xl rounded-xl shadow-glow-gold mb-4">C</div>
                      <h2 className="text-2xl font-bold text-gray-900">ברוך שובך</h2>
                      <p className="text-sm text-gray-500 mt-1">הכנס את הפרטים שלך כדי להמשיך</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">מייל</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-nexus-primary focus:bg-white focus:outline-none transition-all"
                        placeholder="name@company.com"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">סיסמה</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-nexus-primary focus:bg-white focus:outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-nexus-primary hover:bg-gray-800 text-white text-sm font-bold tracking-wide transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-nexus-primary/20"
                    >
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'התחבר למערכת'}
                    </button>
                  </form>
                  
                  <div className="mt-6 text-center">
                      <a href="#" className="text-xs font-medium text-gray-400 hover:text-nexus-primary transition-colors">שכחת סיסמה?</a>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default LoginScreen;
