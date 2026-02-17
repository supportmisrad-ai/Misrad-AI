
import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Award, TrendingUp, CircleCheck, Bell, Shield, LogOut, Settings, Camera, Lock, Briefcase } from 'lucide-react';
import { GlowButton } from './ui/GlowButton';
import { useNexus } from '../context/ClientContext';

const PersonalArea: React.FC = () => {
  const { clients } = useNexus();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weeklyDigest: true
  });

  // Calculate "Real" Stats based on real data
  const totalClients = clients.length;
  const totalRevenue = clients.reduce((acc, c) => acc + c.monthlyRetainer, 0);
  const avgHealth = totalClients > 0 ? Math.round(clients.reduce((acc, c) => acc + c.healthScore, 0) / totalClients) : 0;

  return (
    <div className="space-y-8 animate-slide-up pb-12 pt-safe">
      
      {/* 1. Hero Profile Header */}
      <div className="relative rounded-3xl overflow-hidden bg-white shadow-xl group">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-nexus-primary via-slate-800 to-nexus-primary relative">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
              <div className="absolute top-4 right-4">
                  <button className="bg-black/30 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black/50 transition-colors flex items-center gap-2 border border-white/10">
                      <Camera size={14} /> שנה תמונת נושא
                  </button>
              </div>
          </div>

          <div className="px-8 pb-8 relative">
              {/* Avatar */}
              <div className="absolute -top-16 right-8">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-gray-700 to-gray-600 p-1 shadow-2xl relative group/avatar cursor-pointer">
                      <div className="w-full h-full rounded-[20px] bg-gray-800 flex items-center justify-center text-4xl font-display font-bold text-white border-4 border-white overflow-hidden relative">
                          {/* Placeholder Image or Initials */}
                          <span className="relative z-10">JD</span>
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity z-20 backdrop-blur-sm">
                              <Camera size={24} className="text-white" />
                          </div>
                      </div>
                      <div className="absolute bottom-2 left-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full z-30"></div>
                  </div>
              </div>

              {/* User Info */}
              <div className="flex flex-col md:flex-row justify-between items-end pt-20 md:pt-4 md:pr-40 gap-6">
                  <div>
                      <h1 className="text-3xl font-display font-bold text-gray-900">John Doe</h1>
                      <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                          <Briefcase size={16} className="text-nexus-accent"/> מנהל תיקי לקוחות בכיר (Senior Account Manager)
                      </p>
                      <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5"><MapPin size={14}/> תל אביב, ישראל</span>
                          <span className="flex items-center gap-1.5"><Mail size={14}/> john.doe@nexus.os</span>
                          <span className="flex items-center gap-1.5"><Phone size={14}/> 054-1234567</span>
                      </div>
                  </div>
                  
                  <div className="flex gap-3">
                      <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm">
                          ערוך פרטים
                      </button>
                      <button className="px-5 py-2.5 bg-nexus-primary text-white rounded-xl font-bold text-sm hover:bg-nexus-accent transition-colors shadow-lg flex items-center gap-2">
                          <Settings size={16} /> הגדרות
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. Performance Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-nexus-primary/30 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-nexus-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white shadow-sm rounded-xl text-nexus-primary">
                          <TrendingUp size={24} />
                      </div>
                      <span className="text-xs font-bold bg-green-50 text-green-600 px-2 py-1 rounded">+12% השנה</span>
                  </div>
                  <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">שווי תיק מנוהל (MRR)</h3>
                  <div className="text-3xl font-display font-bold text-gray-900 mt-1">₪{totalRevenue.toLocaleString()}</div>
              </div>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-nexus-accent/30 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-nexus-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white shadow-sm rounded-xl text-nexus-accent">
                          <Award size={24} />
                      </div>
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Top Performer</span>
                  </div>
                  <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">ציון בריאות לקוחות ממוצע</h3>
                  <div className="text-3xl font-display font-bold text-gray-900 mt-1">{avgHealth}/100</div>
              </div>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white shadow-sm rounded-xl text-blue-600">
                          <CircleCheck size={24} />
                      </div>
                      <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">3 פתוחות</span>
                  </div>
                  <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">לקוחות פעילים</h3>
                  <div className="text-3xl font-display font-bold text-gray-900 mt-1">{totalClients}</div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 3. Settings & Preferences */}
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Settings size={20} className="text-gray-400"/> הגדרות אישיות
                  </h3>
                  
                  <div className="space-y-6">
                      {/* Notifications Section */}
                      <div className="space-y-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">התראות</h4>
                          
                          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                              <div className="flex items-center gap-4">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail size={18}/></div>
                                  <div>
                                      <span className="font-bold text-gray-800 block text-sm">סיכום יומי במייל</span>
                                      <span className="text-xs text-gray-500">קבל את "נוהל בוקר" ישירות למייל ב-08:00</span>
                                  </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} className="sr-only peer"/>
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nexus-primary"></div>
                              </label>
                          </div>

                          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                              <div className="flex items-center gap-4">
                                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Bell size={18}/></div>
                                  <div>
                                      <span className="font-bold text-gray-800 block text-sm">התראות דפדפן (Push)</span>
                                      <span className="text-xs text-gray-500">הודעות קופצות על לקוחות בסיכון</span>
                                  </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={notifications.push} onChange={() => setNotifications({...notifications, push: !notifications.push})} className="sr-only peer"/>
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nexus-primary"></div>
                              </label>
                          </div>
                      </div>

                      {/* Security Section */}
                      <div className="space-y-4 pt-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">אבטחה</h4>
                          
                          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                              <div className="flex items-center gap-4">
                                  <div className="p-2 bg-gray-100 text-gray-600 rounded-lg group-hover:bg-nexus-primary group-hover:text-white transition-colors"><Lock size={18}/></div>
                                  <div>
                                      <span className="font-bold text-gray-800 block text-sm">שינוי סיסמה</span>
                                      <span className="text-xs text-gray-500">עודכן לאחרונה לפני 3 חודשים</span>
                                  </div>
                              </div>
                              <button className="text-xs font-bold text-nexus-primary border border-nexus-primary/20 px-3 py-1.5 rounded-lg hover:bg-nexus-primary hover:text-white transition-all">
                                  שנה
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* 4. Recent SquareActivity Log */}
          <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 h-full">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Shield size={20} className="text-gray-400"/> אירועי פעילות
                  </h3>

                  <div className="text-center py-10 text-gray-400 text-sm">
                      אין פעילות להצגה.
                  </div>
              </div>
          </div>
      </div>

      <div className="flex justify-center py-8">
          <button className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl transition-all font-bold text-sm">
              <LogOut size={18} /> התנתק מהמערכת
          </button>
      </div>
    </div>
  );
};

export default PersonalArea;
