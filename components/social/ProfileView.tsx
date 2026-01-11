'use client';

import React, { useState, useRef } from 'react';
import { 
  User, Mail, Camera, Check, Loader2, ArrowRight, 
  MapPin, Briefcase, Award, ShieldCheck, Star, Trash2, Fingerprint
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@clerk/nextjs';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';

export default function ProfileView() {
  const router = useRouter();
  const pathname = usePathname();
  const { addToast, user: appUser } = useApp();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingPasskey, setIsCreatingPasskey] = useState(false);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if Passkeys/WebAuthn is supported
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsPasskeySupported(
        typeof window.PublicKeyCredential !== 'undefined' &&
        typeof navigator.credentials !== 'undefined' &&
        typeof navigator.credentials.create !== 'undefined'
      );
    }
  }, []);

  // Load user's passkeys
  React.useEffect(() => {
    if (user) {
      loadPasskeys();
    }
  }, [user]);

  const loadPasskeys = async () => {
    if (!user) return;
    try {
      // Clerk stores passkeys in user.passkeys (it's an array)
      // Reload user to get latest passkeys
      await user.reload();
      setPasskeys(user.passkeys || []);
    } catch (error) {
      console.error('Error loading passkeys:', error);
      setPasskeys([]);
    }
  };

  const handleCreatePasskey = async () => {
    if (!user) {
      addToast('נא להתחבר כדי ליצור טביעת אצבע', 'error');
      return;
    }

    if (!isPasskeySupported) {
      addToast('טביעת אצבע לא נתמכת בדפדפן שלך', 'error');
      return;
    }

    setIsCreatingPasskey(true);
    try {
      // Create a new passkey using Clerk's API
      // Note: Clerk handles the WebAuthn flow automatically
      // The browser will prompt for biometric authentication
      if (user && 'createPasskey' in user && typeof user.createPasskey === 'function') {
        await (user as any).createPasskey();
        await loadPasskeys();
        addToast('טביעת אצבע נוצרה בהצלחה! כעת תוכל להתחבר עם טביעת אצבע', 'success');
      } else {
        // Fallback: Use WebAuthn directly if Clerk API is not available
        addToast('יצירת טביעת אצבע זמינה דרך Clerk Dashboard', 'info');
      }
    } catch (error: any) {
      console.error('Error creating passkey:', error);
      addToast(error.errors?.[0]?.message || 'שגיאה ביצירת טביעת אצבע. נא להפעיל Passkeys ב-Clerk Dashboard', 'error');
    } finally {
      setIsCreatingPasskey(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    if (!user) return;
    
    try {
      // Find the passkey and delete it
      const passkey = user.passkeys.find((p: any) => p.id === passkeyId);
      if (passkey) {
        await passkey.delete();
        await loadPasskeys();
        addToast('טביעת אצבע נמחקה בהצלחה');
      }
    } catch (error: any) {
      console.error('Error deleting passkey:', error);
      addToast('שגיאה במחיקת טביעת אצבע', 'error');
    }
  };
  
  // Use Clerk user data or empty defaults
  const [profileData, setProfileData] = useState({
    name: appUser?.fullName || appUser?.firstName || '',
    email: appUser?.emailAddresses[0]?.emailAddress || '',
    role: '',
    location: '',
    experience: '',
    certification: '',
    bio: '',
    avatar: appUser?.imageUrl || ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast('הפרופיל האישי עודכן בהצלחה');
    }, 1200);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, avatar: reader.result as string }));
        addToast('תמונת הפרופיל הועלתה בהצלחה');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = () => {
    setProfileData(prev => ({ ...prev, avatar: '' }));
    addToast('תמונת הפרופיל נמחקה');
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-300" dir="rtl">
      <div className="flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-black text-slate-800">הפרופיל שלי</h2>
          <button
            onClick={() => {
              const basePath = getSocialBasePath(pathname);
              router.push(joinPath(basePath, '/dashboard'));
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold transition-all"
          >
            חזרה <ArrowRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col items-center text-center gap-6 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="w-32 h-32 bg-slate-100 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl transition-transform duration-500 flex items-center justify-center">
                  {user?.imageUrl || profileData.avatar ? (
                    <img src={user?.imageUrl || profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="text-slate-300" />
                  )}
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                <div className="absolute -bottom-2 -right-2 flex flex-col gap-2">
                  <button 
                    onClick={triggerUpload}
                    type="button"
                    className="w-12 h-12 bg-blue-600 text-white rounded-2xl border-4 border-white flex items-center justify-center shadow-xl hover:bg-blue-700 transition-all"
                    title="העלאת תמונה"
                  >
                    <Camera size={20}/>
                  </button>
                  {profileData.avatar && (
                    <button 
                      onClick={handleDeleteImage}
                      type="button"
                      className="w-12 h-12 bg-red-500 text-white rounded-2xl border-4 border-white flex items-center justify-center shadow-xl hover:bg-red-600 transition-all"
                      title="מחיקת תמונה"
                    >
                      <Trash2 size={20}/>
                    </button>
                  )}
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-slate-800">{appUser?.fullName || appUser?.firstName || profileData.name}</h3>
                <p className="text-blue-600 font-bold text-sm mt-1">{profileData.role}</p>
              </div>
              <div className="w-full h-px bg-slate-100 relative z-10"></div>
              <div className="w-full flex flex-col gap-4 relative z-10">
                <div className="flex items-center gap-3 text-slate-500 text-sm font-bold text-right">
                  <Mail size={18} className="text-slate-300 shrink-0" />
                  <span>{appUser?.emailAddresses[0]?.emailAddress || profileData.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm font-bold text-right">
                  <MapPin size={18} className="text-slate-300 shrink-0" />
                  <span>{profileData.location}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm font-bold text-right">
                  <Briefcase size={18} className="text-slate-300 shrink-0" />
                  <span>{profileData.experience} ניסיון</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm font-bold text-right">
                  <Award size={18} className="text-slate-300 shrink-0" />
                  <span>{profileData.certification}</span>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-[60px] opacity-50"></div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl text-right">
              <h4 className="text-lg font-black mb-4 flex items-center gap-2 justify-end">
                <Star className="text-yellow-400" size={20}/> הישגים החודש
              </h4>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm font-bold">פוסטים שפורסמו</span>
                  <span className="font-black">142</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm font-bold">לקוחות פעילים</span>
                  <span className="font-black">8</span>
                </div>
                <div className="flex justify-between items-center text-green-400">
                  <span className="text-slate-400 text-sm font-bold">שביעות רצון</span>
                  <span className="font-black">98%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <form onSubmit={handleSave} className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-xl flex flex-col gap-10 text-right">
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-black text-slate-800">עריכת פרטים</h3>
                <p className="text-slate-400 font-bold">נהל את הזהות המקצועית שלך במערכת.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">שם מלא</label>
                  <input 
                    value={user?.fullName || user?.firstName || profileData.name} 
                    disabled
                    className="bg-slate-50 border border-slate-100 rounded-[24px] px-8 py-4 text-lg font-bold outline-none text-right opacity-60" 
                  />
                  <p className="text-[10px] text-slate-400 font-bold mr-4">ניתן לערוך ב-Clerk Dashboard</p>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">כתובת מייל</label>
                  <input 
                    type="email"
                    value={user?.emailAddresses[0]?.emailAddress || profileData.email} 
                    disabled
                    className="bg-slate-50 border border-slate-100 rounded-[24px] px-8 py-4 text-lg font-bold outline-none text-right opacity-60" 
                  />
                  <p className="text-[10px] text-slate-400 font-bold mr-4">ניתן לערוך ב-Clerk Dashboard</p>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">תפקיד</label>
                  <input 
                    value={profileData.role} 
                    onChange={e=>setProfileData({...profileData, role: e.target.value})} 
                    className="bg-slate-50 border border-slate-100 rounded-[24px] px-8 py-4 text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all text-right" 
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">מיקום</label>
                  <input 
                    value={profileData.location} 
                    onChange={e=>setProfileData({...profileData, location: e.target.value})} 
                    className="bg-slate-50 border border-slate-100 rounded-[24px] px-8 py-4 text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all text-right" 
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">שנות ניסיון</label>
                  <input 
                    value={profileData.experience} 
                    onChange={e=>setProfileData({...profileData, experience: e.target.value})} 
                    className="bg-slate-50 border border-slate-100 rounded-[24px] px-8 py-4 text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all text-right" 
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">הסמכה מקצועית</label>
                  <input 
                    value={profileData.certification} 
                    onChange={e=>setProfileData({...profileData, certification: e.target.value})} 
                    className="bg-slate-50 border border-slate-100 rounded-[24px] px-8 py-4 text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all text-right" 
                    placeholder="לדוגמה: מומחה Social מוסמך" 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">אודות (Bio)</label>
                <textarea 
                  value={profileData.bio} 
                  onChange={e=>setProfileData({...profileData, bio: e.target.value})} 
                  className="bg-slate-50 border border-slate-100 rounded-[24px] px-8 py-5 text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all h-40 resize-none leading-relaxed text-right" 
                />
              </div>

              {/* Passkeys Section */}
              <div className="flex flex-col gap-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Fingerprint size={20} className="text-blue-600" />
                      טביעת אצבע (Passkeys)
                    </h4>
                    <p className="text-sm font-bold text-slate-400 mt-1">
                      התחברות מאובטחת ללא סיסמה באמצעות טביעת אצבע או Face ID
                    </p>
                  </div>
                </div>

                {!isPasskeySupported && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-amber-700">
                      טביעת אצבע לא נתמכת בדפדפן שלך. נסה בדפדפן מודרני כמו Chrome, Safari או Edge.
                    </p>
                  </div>
                )}

                {isPasskeySupported && (
                  <div className="flex flex-col gap-4">
                    {passkeys.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {passkeys.map((passkey: any) => (
                          <div key={passkey.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Fingerprint size={20} className="text-blue-600" />
                              <div>
                                <p className="font-black text-slate-800">{passkey.name || 'טביעת אצבע'}</p>
                                <p className="text-xs font-bold text-slate-400">
                                  נוצר ב-{new Date(passkey.createdAt).toLocaleDateString('he-IL')}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeletePasskey(passkey.id)}
                              className="text-red-500 hover:text-red-700 font-bold text-sm"
                            >
                              מחק
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                        <Fingerprint size={48} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-400 mb-4">
                          אין טביעות אצבע מוגדרות
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCreatePasskey}
                      disabled={isCreatingPasskey || !isPasskeySupported}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingPasskey ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          יוצר טביעת אצבע...
                        </>
                      ) : (
                        <>
                          <Fingerprint size={18} />
                          צור טביעת אצבע חדשה
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 pt-6 border-t border-slate-200 justify-end">
                <div className="flex items-center gap-2 text-green-500 font-bold text-sm ml-auto">
                  <ShieldCheck size={20} />
                  <span>הפרופיל שלך מאובטח ומאומת</span>
                </div>
                <button type="submit" disabled={isSaving} className="bg-blue-600 text-white px-12 py-5 rounded-[28px] font-black shadow-xl shadow-blue-100 flex items-center gap-3 hover:bg-blue-700 active:scale-95 transition-all">
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Check size={24}/>} שמור שינויים
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

