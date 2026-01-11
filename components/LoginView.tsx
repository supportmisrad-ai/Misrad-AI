
import React, { useState, useEffect } from 'react';
import { ArrowRight, Lock, Mail, Target, Zap, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';

const LoginView = () => {
  const { login } = useAuth();
  const { brandName, brandLogo } = useBrand();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = (e?: React.FormEvent, role: 'admin' | 'agent' = 'admin') => {
    if (e) e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
        login(role);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#09090B]" dir="rtl">
      
      {/* --- Dynamic Background --- */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#09090B] to-[#111827] z-0"></div>
      
      <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-blob z-0 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px] animate-blob animation-delay-2000 z-0 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}></div>
      
      <div className="absolute inset-0 z-0 opacity-[0.02]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}>
      </div>

      <div className={`w-full max-w-[420px] relative z-10 transition-all duration-700 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden ring-1 ring-white/5">
            
            <div className="p-8 pb-0 text-center relative">
                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 text-white shadow-2xl mb-6">
                   {brandLogo ? (
                       <img src={brandLogo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                   ) : (
                       <Target size={36} strokeWidth={1.5} className="text-primary" />
                   )}
                </div>
                
                <h1 className="text-3xl font-black text-white tracking-tight font-sans">
                  {brandName}
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-2 tracking-wide uppercase">Core Intelligence OS</p>
            </div>

            <div className="p-8 space-y-5">
              <form onSubmit={(e) => handleLogin(e, 'admin')} className="space-y-4">
                
                <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">מזהה משתמש</label>
                    <div className="relative">
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3.5 pl-10 text-sm font-medium text-white placeholder:text-slate-700 focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="admin@nexus.os"
                        />
                        <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                    </div>
                </div>

                <div className="space-y-1.5 group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">סיסמה</label>
                    <div className="relative">
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3.5 pl-10 text-sm font-medium text-white placeholder:text-slate-700 focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="••••••••"
                        />
                        <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-nexus-gradient text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                >
                    {isLoading ? "מתחבר..." : "כניסה למערכת"}
                    {!isLoading && <ArrowRight size={18} />}
                </button>
              </form>

              <div className="pt-6 border-t border-white/5 flex gap-3">
                  <button onClick={() => handleLogin(undefined, 'admin')} className="flex-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase py-2 bg-white/5 rounded-lg transition-colors">מנהל</button>
                  <button onClick={() => handleLogin(undefined, 'agent')} className="flex-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase py-2 bg-white/5 rounded-lg transition-colors">סוכן</button>
              </div>
            </div>
            
            <div className="bg-slate-950/30 p-4 text-center border-t border-white/5">
                <div className="flex items-center justify-center gap-2 text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                    <Zap size={10} className="text-primary" />
                    Nexus Core v2.5.0
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
