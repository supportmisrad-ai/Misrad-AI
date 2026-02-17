'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Image, Zap, Minus, Plus } from 'lucide-react';
import { AgencyServiceConfig } from '@/types/social';

interface StoreTabProps {
  marketplaceAddons: AgencyServiceConfig[];
  cart: {service: AgencyServiceConfig, qty: number}[];
  updateCart: (service: AgencyServiceConfig, delta: number) => void;
  handleCheckoutStore: () => void;
  totalCartPrice: number;
}

const StoreTab: React.FC<StoreTabProps> = ({ marketplaceAddons, cart, updateCart, handleCheckoutStore, totalCartPrice }) => {
  return (
    <motion.div key="store" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Marketplace</h2>
          <p className="text-slate-400 font-bold mt-1">שדרגו את הנוכחות הדיגיטלית שלכם בלחיצת כפתור.</p>
        </div>
        {cart.length > 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl flex items-center gap-8 border border-white/10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/40 uppercase">סה"כ לתשלום</span>
              <span className="text-2xl font-black">₪{totalCartPrice.toLocaleString()}</span>
            </div>
            <button onClick={handleCheckoutStore} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-lg">המשך לתשלום</button>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {marketplaceAddons.map(addon => {
          const cartItem = cart.find(i => i.service.id === addon.id);
          return (
            <div key={addon.id} className="bg-white p-8 rounded-[48px] border-2 border-slate-50 shadow-sm hover:shadow-xl transition-all group flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${addon.category === 'content' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                  {addon.category === 'content' ? <Image size={28}/> : <Zap size={28}/>}
                </div>
                <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${addon.isRecurring ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
                  {addon.isRecurring ? 'תוספת חודשית' : 'חד פעמי'}
                </span>
              </div>
              <h4 className="text-2xl font-black text-slate-800 mb-2">{addon.label}</h4>
              <p className="text-xs font-bold text-slate-400 mb-6 flex-1 leading-relaxed">{addon.description}</p>
              
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <span className="text-xl font-black text-slate-900">₪{addon.basePrice.toLocaleString()}</span>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <button onClick={() => updateCart(addon, -1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900"><Minus size={16}/></button>
                  <span className="font-black text-sm min-w-[20px] text-center">{cartItem?.qty || 0}</span>
                  <button onClick={() => updateCart(addon, 1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900"><Plus size={16}/></button>
                </div>
              </div>
            </div>
          );
        })}
        {marketplaceAddons.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300 font-bold border-2 border-dashed rounded-[48px]">אין הצעות שירות זמינות כרגע</div>
        )}
      </div>
    </motion.div>
  );
};

export default StoreTab;

