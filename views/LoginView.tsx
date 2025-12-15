
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, ArrowRight, ShieldCheck, Zap, Globe, Cpu, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginView: React.FC = () => {
  const { users, login, organization } = useData();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when entering password view
  useEffect(() => {
      if (selectedUserId) {
          // Small timeout to allow animation to start/render
          setTimeout(() => {
              passwordInputRef.current?.focus();
          }, 100);
      }
  }, [selectedUserId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    if (password.length > 0) {
      setIsLoading(true);
      // Fake loading delay for effect
      setTimeout(() => {
          login(selectedUserId);
          navigate('/');
      }, 800);
    } else {
        setError('נדרשת סיסמה לכניסה');
        // Keep focus on input
        passwordInputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-row overflow-hidden" dir="rtl">
      
      {/* Right Side - Brand / Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-black relative flex-col justify-between p-12 text-white overflow-hidden">
          {/* Abstract Background Animation */}
          <div className="absolute inset-0 opacity-30">
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
               <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
          </div>

          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                      {organization.logo ? (
                          <img src={organization.logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-4 h-4 bg-black rounded-full" />
                      )}
                  </div>
                  <span className="font-bold text-3xl tracking-tight">{organization.name}</span>
              </div>
              <h2 className="text-5xl font-bold leading-tight max-w-md">
                  ניהול העסק שלך,<br/> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ברמה הבאה.</span>
              </h2>
          </div>

          <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                      <ShieldCheck size={16} className="text-green-400" /> אבטחה מקצה לקצה
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10">
                      <Zap size={16} className="text-yellow-400" /> ביצועים מהירים
                  </div>
              </div>
              <p className="text-gray-500 text-xs flex items-center gap-2">
                  <span>Powered by Nexus OS</span>
                  <span>&copy; 2024 Nexus Systems.</span>
              </p>
          </div>
      </div>

      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 relative">
        {/* Mobile Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600 lg:hidden"></div>

        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
        >
            <div className="mb-10 text-center lg:text-right">
                <div className="lg:hidden flex justify-center mb-4">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex items-center justify-center">
                        {organization.logo ? (
                            <img src={organization.logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-6 h-6 bg-black rounded-full" />
                        )}
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">ברוכים השבים</h3>
                <p className="text-gray-500">נא להזדהות כדי לגשת למרחב העבודה של <span className="font-bold text-black">{organization.name}</span>.</p>
            </div>

            <div className="bg-white p-2 rounded-3xl shadow-xl shadow-gray-200/50 border border-white">
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {!selectedUserId ? (
                            <motion.div 
                                key="user-select"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block">בחר משתמש</label>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                                    {users.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => { setSelectedUserId(user.id); setError(''); }}
                                            className="w-full flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group text-right relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/30 transition-colors"></div>
                                            <img src={user.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-sm z-10 object-cover" />
                                            <div className="z-10 flex-1">
                                                <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.role}</div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 z-10 shadow-sm">
                                                <ArrowLeft size={16} className="text-blue-600" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="password-input"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between mb-8">
                                     <div className="flex items-center gap-3">
                                         <img src={users.find(u => u.id === selectedUserId)?.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover" />
                                         <div>
                                             <div className="font-bold text-gray-900 text-lg">{users.find(u => u.id === selectedUserId)?.name}</div>
                                             <div className="text-xs text-gray-500">נדרש אימות</div>
                                         </div>
                                     </div>
                                     <button 
                                        type="button"
                                        onClick={() => setSelectedUserId(null)}
                                        className="text-xs font-bold text-gray-400 hover:text-gray-600 underline"
                                     >
                                         החלף משתמש
                                     </button>
                                </div>

                                <form onSubmit={handleLogin}>
                                    <div className="mb-6">
                                        <div className="relative group">
                                            <Lock size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                            <input 
                                                ref={passwordInputRef}
                                                autoFocus
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pr-12 pl-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-900 placeholder:text-gray-400"
                                                placeholder="הקלד סיסמה..."
                                            />
                                        </div>
                                        {error && (
                                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                                                <span className="w-1 h-1 bg-red-50 rounded-full"></span> {error}
                                            </motion.p>
                                        )}
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                כניסה למערכת <ArrowLeft size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Status Bar */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs font-medium text-gray-400">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> מערכות תקינות</span>
                <span className="flex items-center gap-1.5"><Globe size={12} /> אזור IL-TLV</span>
                <span className="flex items-center gap-1.5"><Cpu size={12} /> Nexus v2.5.0</span>
            </div>

        </motion.div>
      </div>
    </div>
  );
};
