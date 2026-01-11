

import React, { useState } from 'react';
import { Save, Shield, DollarSign, Cpu, Bell, Building2, Key, Info, GitMerge, AlertTriangle, ShoppingBag, ListPlus, Tag, Star, Trash2, Edit2, MessageSquare, Clock, LayoutTemplate, FileText, Upload } from 'lucide-react';
import { GlowButton } from './ui/GlowButton';
import { GlassCard } from './ui/GlassCard';
import { UPSELL_CATALOG } from '../constants';

type SettingsTab = 'general' | 'financials' | 'catalog' | 'intelligence' | 'automation';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('catalog');
  const [isSaving, setIsSaving] = useState(false);

  // Mock Data State
  const [hourlyCost, setHourlyCost] = useState('');
  const [targetMargin, setTargetMargin] = useState('0');
  const [riskSensitivity, setRiskSensitivity] = useState('medium');
  const [catalog, setCatalog] = useState(() => ([] as typeof UPSELL_CATALOG));
  const [npsThreshold, setNpsThreshold] = useState(0);
  const [surveyFrequency, setSurveyFrequency] = useState('');
  
  // Bug fix: Manage files in state
  const [companyFiles, setCompanyFiles] = useState<{ name: string; id: string }[]>([]);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => setIsSaving(false), 1500);
  };

  const handleDeleteItem = (id: string) => {
      setCatalog(prev => prev.filter(item => item.id !== id));
  };

  const handleDeleteFile = (id: string) => {
      setCompanyFiles(prev => prev.filter(f => f.id !== id));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-display font-semibold text-gray-900 mb-1">מי אנחנו?</h3>
              <p className="text-sm text-gray-500">הפרטים שהלקוחות רואים.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">איך קוראים לעסק</label>
                  <input type="text" defaultValue="" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-gray-900 focus:border-nexus-primary focus:outline-none transition-colors" />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">באיזה כסף עובדים</label>
                  <select className="w-full bg-white border border-gray-200 rounded-xl p-3 text-gray-900 focus:border-nexus-primary focus:outline-none transition-colors">
                     <option>דולר ($)</option>
                     <option>שקל (₪)</option>
                     <option>אירו (€)</option>
                  </select>
               </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
               <h3 className="text-lg font-display font-semibold text-gray-900 mb-4 flex items-center gap-2">
                   <FileText size={18} className="text-nexus-accent"/> קבצים קבועים
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {companyFiles.map((file) => (
                       <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><FileText size={16}/></div>
                               <span className="text-sm font-medium text-gray-700">{file.name}</span>
                           </div>
                           <button 
                               onClick={() => handleDeleteFile(file.id)}
                               className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                           >
                               <Trash2 size={16}/>
                           </button>
                       </div>
                   ))}
                   <button className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-nexus-primary hover:border-nexus-primary hover:bg-nexus-primary/5 transition-all">
                       <Upload size={16}/> תעלה קובץ חדש
                   </button>
               </div>
            </div>
          </div>
        );

      case 'financials':
        return (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h3 className="text-xl font-display font-semibold text-gray-900 mb-1">כסף ומספרים</h3>
              <p className="text-sm text-gray-500">כדי שנדע מתי אתה מרוויח ומתי מפסיד.</p>
            </div>

            {/* Cost Configuration */}
            <div className="glass-card p-6 border-nexus-border rounded-xl">
               <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-signal-warning/10 text-signal-warning border border-signal-warning/20">
                     <DollarSign size={24} />
                  </div>
                  <div>
                     <h4 className="text-lg font-medium text-gray-900">כמה עולה לנו שעה?</h4>
                     <p className="text-sm text-gray-500 mt-1 max-w-lg">
                        כדי לחשב רווח אמיתי, אנחנו צריכים לדעת כמה עולה שעת עבודה של עובד (כולל הכל).
                     </p>
                  </div>
               </div>
               
               <div className="flex items-center gap-4">
                  <div className="relative w-40">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                     <input 
                        type="number" 
                        value={hourlyCost}
                        onChange={(e) => setHourlyCost(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-4 text-gray-900 font-mono focus:border-signal-warning focus:outline-none" 
                     />
                  </div>
                  <span className="text-sm text-gray-500">לשעה</span>
               </div>
            </div>

            {/* Margin Configuration */}
            <div className="glass-card p-6 border-nexus-border rounded-xl">
               <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-signal-success/10 text-signal-success border border-signal-success/20">
                     <AlertTriangle size={24} />
                  </div>
                  <div>
                     <h4 className="text-lg font-medium text-gray-900">מתי מתחילים להפסיד?</h4>
                     <p className="text-sm text-gray-500 mt-1 max-w-lg">
                        אם הרווח יורד מתחת למספר הזה, תקבל התראה שהלקוח בצרות.
                     </p>
                  </div>
               </div>
               
               <div className="w-full max-w-md">
                  <div className="flex justify-between mb-2">
                     <span className="text-xs text-gray-500 font-bold uppercase">0%</span>
                     <span className="text-xs text-nexus-primary font-bold uppercase">100%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="80" 
                    value={targetMargin} 
                    onChange={(e) => setTargetMargin(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-signal-success"
                  />
                  <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                     <span className="text-sm text-gray-600">תצעק עליי כשהרווח יורד מ:</span>
                     <span className="text-xl font-mono font-bold text-signal-success">{targetMargin}%</span>
                  </div>
               </div>
            </div>
          </div>
        );

      case 'catalog':
          return (
              <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                      <div>
                          <h3 className="text-xl font-display font-semibold text-gray-900 mb-1">החנות שלנו</h3>
                          <p className="text-sm text-gray-500">מה אנחנו מוכרים ללקוחות.</p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-nexus-primary text-white rounded-xl text-xs font-bold hover:bg-nexus-accent transition-colors shadow-lg shadow-nexus-primary/20">
                          <ListPlus size={16} /> הוסף שירות
                      </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                      {catalog.map((item) => (
                          <div key={item.id} className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-nexus-primary/30 hover:shadow-lg transition-all">
                              <div className="p-3 bg-gray-50 rounded-lg text-gray-400 group-hover:text-nexus-primary group-hover:bg-nexus-primary/5 transition-colors">
                                  <ShoppingBag size={20} />
                              </div>
                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                                      {item.isPopular && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold"><Star size={8} fill="currentColor"/> הולך חזק</span>}
                                  </div>
                                  <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="text-right">
                                      <span className="block font-mono font-bold text-gray-900">₪{item.price.toLocaleString()}</span>
                                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide">{item.category}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-nexus-primary transition-colors"><Edit2 size={16}/></button>
                                      <button onClick={() => handleDeleteItem(item.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          );

      case 'intelligence':
        return (
          <div className="space-y-8 animate-fade-in">
             <div>
              <h3 className="text-xl font-display font-semibold text-gray-900 mb-1">המוח של המערכת</h3>
              <p className="text-sm text-gray-500">כמה חכם המערכת צריכה להיות.</p>
            </div>

            {/* Liability Shield Sensitivity */}
            <div className="glass-card p-6 border-nexus-border rounded-xl">
               <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-nexus-accent/10 text-nexus-accent border border-nexus-accent/20">
                     <Shield size={24} />
                  </div>
                  <div>
                     <h4 className="text-lg font-medium text-gray-900">כמה ה-AI לחוץ? (רגישות)</h4>
                     <p className="text-sm text-gray-500 mt-1 max-w-lg">
                        כמה קשה ה-AI צריך לחפש הבטחות שנתתם ללקוחות בשיחות?
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  {['low', 'medium', 'high'].map((level) => (
                     <button
                        key={level}
                        onClick={() => setRiskSensitivity(level)}
                        className={`
                           p-4 rounded-xl border flex flex-col items-center gap-2 transition-all
                           ${riskSensitivity === level 
                              ? 'bg-nexus-primary/10 border-nexus-primary text-nexus-primary shadow-[0_4px_15px_rgba(112,0,255,0.1)]' 
                              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}
                        `}
                     >
                        <span className="capitalize font-bold">{level === 'low' ? 'רגוע' : level === 'medium' ? 'רגיל' : 'לחוץ'}</span>
                        <span className="text-[10px] opacity-70 text-center">
                           {level === 'low' ? 'רק הבטחות ברורות ("אני מבטיח")' : 
                            level === 'medium' ? 'רגיל (מומלץ)' : 
                            'מחמיר מאוד (כל רמז להבטחה)'}
                        </span>
                     </button>
                  ))}
               </div>
            </div>
          </div>
        );

      case 'automation':
        return (
          <div className="space-y-8 animate-fade-in">
             <div>
              <h3 className="text-xl font-display font-semibold text-gray-900 mb-1">טייס אוטומטי</h3>
              <p className="text-sm text-gray-500">לשלוח דברים לבד.</p>
            </div>

            <div className="glass-card p-6 border-nexus-border rounded-xl">
               <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-nexus-primary/10 text-nexus-primary border border-nexus-primary/20">
                     <MessageSquare size={24} />
                  </div>
                  <div>
                     <h4 className="text-lg font-medium text-gray-900">תדירות סקרים</h4>
                     <p className="text-sm text-gray-500 mt-1 max-w-lg">
                        כל כמה זמן המערכת תשלח ללקוח שאלון "מה המצב"?
                     </p>
                  </div>
               </div>
               
               <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                   <Clock size={20} className="text-gray-400"/>
                   <span className="text-sm font-bold text-gray-700">שלח סקר כל:</span>
                   <select 
                      value={surveyFrequency}
                      onChange={(e) => setSurveyFrequency(e.target.value)}
                      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-nexus-primary focus:border-nexus-primary block p-2.5 outline-none font-bold"
                   >
                       <option value="30">30 יום</option>
                       <option value="60">60 יום</option>
                       <option value="90">90 יום (רבעון)</option>
                       <option value="180">180 יום (חצי שנה)</option>
                   </select>
               </div>
            </div>

            <div className="glass-card p-6 border-nexus-border rounded-xl">
               <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-signal-danger/10 text-signal-danger border border-signal-danger/20">
                     <AlertTriangle size={24} />
                  </div>
                  <div>
                     <h4 className="text-lg font-medium text-gray-900">מתי להיכנס ללחץ? (NPS)</h4>
                     <p className="text-sm text-gray-500 mt-1 max-w-lg">
                        אם הציון יורד מתחת למספר הזה, נצעק עליך.
                     </p>
                  </div>
               </div>
               
               <div className="flex items-center gap-6">
                   <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={npsThreshold}
                      onChange={(e) => setNpsThreshold(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-signal-danger"
                   />
                   <div className="flex flex-col items-center justify-center w-16 h-16 bg-white border-2 border-signal-danger rounded-xl shadow-sm">
                       <span className="text-2xl font-bold text-signal-danger">{npsThreshold}</span>
                   </div>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8 animate-fade-in duration-500">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 flex flex-col gap-2">
         <h1 className="text-3xl font-display font-bold text-gray-900 mb-6 px-2">הגדרות</h1>
         
         <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            <button 
               onClick={() => setActiveTab('general')}
               className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'general' ? 'bg-white border border-gray-200 text-nexus-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
               <Building2 size={18} /> הבסיס
            </button>
            <button 
               onClick={() => setActiveTab('financials')}
               className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'financials' ? 'bg-white border border-gray-200 text-nexus-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
               <DollarSign size={18} /> המספרים
            </button>
            <button 
               onClick={() => setActiveTab('catalog')}
               className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'catalog' ? 'bg-white border border-gray-200 text-nexus-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
               <ShoppingBag size={18} /> המוצרים
            </button>
            <button 
               onClick={() => setActiveTab('automation')}
               className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'automation' ? 'bg-white border border-gray-200 text-nexus-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
               <Bell size={18} /> טייס אוטומטי
            </button>
            <button 
               onClick={() => setActiveTab('intelligence')}
               className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === 'intelligence' ? 'bg-white border border-gray-200 text-nexus-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
               <Cpu size={18} /> המוח
            </button>
         </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col max-w-4xl">
         <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 lg:pb-20">
            {renderTabContent()}
         </div>

         {/* Sticky Footer for Actions */}
         <div className="pt-6 border-t border-nexus-border flex justify-end gap-4 lg:pb-0 pb-20">
            <button className="px-6 py-3 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors font-medium">
               בטל
            </button>
            <GlowButton onClick={handleSave} isLoading={isSaving}>
               <Save size={18} className="mr-2" />
               שמור את זה
            </GlowButton>
         </div>
      </div>
    </div>
  );
};

export default Settings;