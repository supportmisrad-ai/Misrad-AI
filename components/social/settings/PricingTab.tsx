'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Globe, ShoppingCart, Trash2, ImageIcon, Zap } from 'lucide-react';
import { AgencyServiceConfig, SocialPlatform } from '@/types/social';
import { PLATFORM_ICONS } from '../SocialIcons';

interface PricingTabProps {
  platformConfigs: AgencyServiceConfig[];
  setPlatformConfigs: React.Dispatch<React.SetStateAction<AgencyServiceConfig[]>>;
  marketplaceAddons: AgencyServiceConfig[];
  setMarketplaceAddons: React.Dispatch<React.SetStateAction<AgencyServiceConfig[]>>;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const CustomToggle = ({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className={`relative w-14 h-7 rounded-full transition-all duration-500 focus:outline-none shadow-inner flex items-center px-1 overflow-hidden shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
  >
    <motion.div
      animate={{ x: enabled ? 28 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="w-5 h-5 bg-white rounded-full shadow-md z-10"
    />
  </button>
);

export default function PricingTab({ platformConfigs, setPlatformConfigs, marketplaceAddons, setMarketplaceAddons, onNotify }: PricingTabProps) {
  const [isAddingPlatform, setIsAddingPlatform] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newPlatformPrice, setNewPlatformPrice] = useState('0');
  
  const [isAddingAddon, setIsAddingAddon] = useState(false);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('0');
  const [newAddonDesc, setNewAddonDesc] = useState('');
  const [newAddonRecurring, setNewAddonRecurring] = useState(false);

  const handleTogglePlatform = (id: string) => {
    setPlatformConfigs(prev => prev.map(p => p.id === id ? { ...p, isEnabled: !p.isEnabled } : p));
  };

  const handlePriceChange = (id: string, price: string) => {
    const numericPrice = parseInt(price) || 0;
    setPlatformConfigs(prev => prev.map(p => p.id === id ? { ...p, basePrice: numericPrice } : p));
  };

  const handleAddPlatform = () => {
    if (!newPlatformName.trim()) {
      onNotify('נא להזין שם לפלטפורמה', 'error');
      return;
    }
    const newId = String(newPlatformName ?? '').toLowerCase().replace(/\s+/g, '_');
    const newConfig: AgencyServiceConfig = {
      id: newId,
      label: newPlatformName,
      isEnabled: true,
      basePrice: parseInt(newPlatformPrice) || 0
    };
    setPlatformConfigs(prev => [...prev, newConfig]);
    setNewPlatformName('');
    setNewPlatformPrice('0');
    setIsAddingPlatform(false);
    onNotify('הפלטפורמה נוספה בהצלחה למחירון!');
  };

  const handleAddAddon = () => {
    if (!newAddonName.trim()) {
      onNotify('נא להזין שם לשירות', 'error');
      return;
    }
    const newAddon: AgencyServiceConfig = {
      id: `addon_${Date.now()}`,
      label: newAddonName,
      isEnabled: true,
      basePrice: parseInt(newAddonPrice) || 0,
      description: newAddonDesc,
      isRecurring: newAddonRecurring,
      category: newAddonRecurring ? 'strategy' : 'content'
    };
    setMarketplaceAddons(prev => [...prev, newAddon]);
    setNewAddonName('');
    setNewAddonPrice('0');
    setNewAddonDesc('');
    setNewAddonRecurring(false);
    setIsAddingAddon(false);
    onNotify('השירות נוסף בהצלחה למרקטפלייס!');
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-800">שירותים ומחירון</h2>
      </div>

      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-black">ניהול פלטפורמות ומחירים</h3>
          </div>
          <button onClick={() => setIsAddingPlatform(!isAddingPlatform)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center gap-2">
            {isAddingPlatform ? <X size={20}/> : <Plus size={20}/>} הוסף פלטפורמה
          </button>
        </div>
        {isAddingPlatform && (
          <div className="bg-blue-50/50 p-8 rounded-[32px] border-2 border-dashed border-blue-200 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mr-2">שם הפלטפורמה</label>
              <input type="text" value={newPlatformName} onChange={e => setNewPlatformName(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-4 font-bold" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase mr-2">מחיר (₪)</label>
              <input type="number" value={newPlatformPrice} onChange={e => setNewPlatformPrice(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-4 font-bold" />
            </div>
            <button onClick={handleAddPlatform} className="bg-blue-600 text-white py-4 rounded-xl font-black">הוסף למחירון</button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platformConfigs.map((config) => {
            const Icon = PLATFORM_ICONS[config.id as SocialPlatform] || Globe;
            return (
              <div key={config.id} className={`p-6 rounded-[32px] border-2 transition-all flex items-center justify-between ${config.isEnabled ? 'border-blue-50 bg-white shadow-sm' : 'border-slate-50 bg-slate-50 opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${config.isEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Icon size={20} />
                  </div>
                  <span className="font-black text-sm">{config.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <input type="number" disabled={!config.isEnabled} value={config.basePrice} onChange={(e) => handlePriceChange(config.id, e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 w-24 text-center font-black text-sm" />
                  <CustomToggle enabled={config.isEnabled} onToggle={() => handleTogglePlatform(config.id)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-black flex items-center gap-2"><ShoppingCart size={24} className="text-blue-600"/> ניהול Marketplace</h3>
          </div>
          <button onClick={() => setIsAddingAddon(!isAddingAddon)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2">
            {isAddingAddon ? <X size={20}/> : <Plus size={20}/>} הוסף שירות
          </button>
        </div>
        {isAddingAddon && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-50/30 p-8 rounded-[40px] border-2 border-dashed border-blue-200 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-2">שם השירות</label>
                <input type="text" value={newAddonName} onChange={e => setNewAddonName(e.target.value)} placeholder="לדוגמה: יום צילום נוסף" className="bg-white border border-slate-200 rounded-2xl p-4 font-bold outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-2">מחיר (₪)</label>
                <input type="number" value={newAddonPrice} onChange={e => setNewAddonPrice(e.target.value)} className="bg-white border border-slate-200 rounded-2xl p-4 font-bold outline-none" />
              </div>
            </div>
            <textarea value={newAddonDesc} onChange={e => setNewAddonDesc(e.target.value)} placeholder="תאר מה הלקוח מקבל..." className="bg-white border border-slate-200 rounded-2xl p-4 font-bold h-24 resize-none" />
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-600">ריטיינר חודשי?</span>
              <CustomToggle enabled={newAddonRecurring} onToggle={() => setNewAddonRecurring(!newAddonRecurring)} />
            </div>
            <button onClick={handleAddAddon} className="bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">שמור והוסף</button>
          </motion.div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {marketplaceAddons.map((addon) => (
            <div key={addon.id} className="bg-slate-50/50 p-6 rounded-[36px] border border-slate-100 flex flex-col gap-4 relative group">
              <button onClick={() => setMarketplaceAddons(prev => prev.filter(a => a.id !== addon.id))} className="absolute top-4 left-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={18}/>
              </button>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${addon.category === 'content' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                  {addon.category === 'content' ? <ImageIcon size={24}/> : <Zap size={24}/>}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-800">{addon.label} {addon.isRecurring && <span className="bg-purple-50 text-purple-600 text-[8px] px-2 py-0.5 rounded-md font-black">חודשי</span>}</h4>
                </div>
                <div className="text-left"><p className="text-lg font-black text-blue-600">₪{addon.basePrice.toLocaleString()}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

