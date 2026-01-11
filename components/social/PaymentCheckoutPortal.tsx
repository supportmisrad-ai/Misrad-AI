'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CreditCard, ChevronLeft, CheckCircle2, Lock, Loader2, X } from 'lucide-react';
import { PaymentOrder, Client } from '@/types/social';
import { processPayment } from '@/app/actions/payments';

interface PaymentCheckoutPortalProps {
  order: PaymentOrder;
  client: Client;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentCheckoutPortal({ order, client, onSuccess, onCancel }: PaymentCheckoutPortalProps) {
  const [installments, setInstallments] = useState<1 | 2>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'checkout' | 'success'>('checkout');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const installmentAmount = (order.amount / installments).toFixed(2);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      setError('מספר כרטיס לא תקין');
      return;
    }
    
    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
      setError('תאריך תפוגה לא תקין');
      return;
    }
    
    if (!cvv || cvv.length < 3) {
      setError('CVV לא תקין');
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await processPayment(
        order.id,
        cardNumber.replace(/\s/g, ''),
        expiryDate,
        cvv,
        installments
      );

      if (result.success && result.transactionId) {
        setTransactionId(result.transactionId);
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } else {
        setError(result.error || 'שגיאה בעיבוד התשלום');
      }
    } catch (err) {
      setError('שגיאה בעיבוד התשלום. נסה שוב.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-12" dir="rtl">
      <div className="w-full max-w-4xl bg-white rounded-[64px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-100">
        <div className="w-full md:w-96 bg-slate-900 p-12 text-white flex flex-col gap-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-xl">S</div>
            <span className="font-black text-xl tracking-tight">Social Pay</span>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">עבור העסק:</p>
            <div className="flex items-center gap-4">
              <img src={client.avatar} className="w-12 h-12 rounded-2xl border-2 border-white/20" alt={client.companyName} />
              <h2 className="text-2xl font-black">{client.companyName}</h2>
            </div>
          </div>

          <div className="flex flex-col gap-6 pt-10 border-t border-white/10 mt-auto">
            <div className="flex justify-between items-center">
              <span className="text-white/60 font-bold">תיאור השירות</span>
              <span className="font-black text-right max-w-[150px]">{order.description}</span>
            </div>
            <div className="flex justify-between items-center text-3xl font-black pt-4 border-t border-white/10">
              <span>סה"כ</span>
              <span>₪{order.amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-widest mt-6">
            <Lock size={14}/> תשלום מאובטח בתקן PCI-DSS
          </div>
        </div>

        <div className="flex-1 p-12 md:p-16 flex flex-col relative">
          <AnimatePresence mode="wait">
            {step === 'checkout' ? (
              <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black">השלמת התשלום</h2>
                  <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-900">
                    <X size={20}/>
                  </button>
                </div>
                
                <div className="flex flex-col gap-6">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">בחירת פריסת תשלומים</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setInstallments(1)}
                      className={`p-6 rounded-[32px] border-4 flex flex-col gap-2 text-right transition-all ${installments === 1 ? 'border-slate-900 bg-white shadow-xl' : 'border-slate-50 hover:border-slate-100'}`}
                    >
                      <p className="font-black text-xl">תשלום אחד</p>
                      <p className="text-[10px] font-bold text-slate-400">₪{order.amount.toLocaleString()} בחיוב מיידי</p>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setInstallments(2)}
                      className={`p-6 rounded-[32px] border-4 flex flex-col gap-2 text-right transition-all ${installments === 2 ? 'border-slate-900 bg-white shadow-xl' : 'border-slate-50 hover:border-slate-100'}`}
                    >
                      <p className="font-black text-xl">2 תשלומים</p>
                      <p className="text-[10px] font-bold text-slate-400">₪{installmentAmount} לחודש</p>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold px-4">* ניתן לחלק לעד 2 תשלומים ללא ריבית.</p>
                </div>

                <form onSubmit={handlePay} className="flex flex-col gap-8">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase mr-4 tracking-widest">פרטי כרטיס אשראי</label>
                      <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 flex items-center gap-4 focus-within:ring-4 ring-blue-50 transition-all">
                        <CreditCard className="text-slate-300" size={24}/>
                        <input 
                          required 
                          placeholder="1234 5678 9012 3456" 
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19}
                          className="bg-transparent outline-none flex-1 text-xl font-bold" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 flex items-center gap-4">
                        <input 
                          required 
                          placeholder="MM/YY" 
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                          maxLength={5}
                          className="bg-transparent outline-none flex-1 text-xl font-bold text-center" 
                        />
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-6 flex items-center gap-4">
                        <input 
                          required 
                          placeholder="CVV" 
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          maxLength={4}
                          type="password"
                          className="bg-transparent outline-none flex-1 text-xl font-bold text-center" 
                        />
                      </div>
                    </div>
                    {error && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-bold">
                        {error}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[32px] border flex items-start gap-4">
                    <ShieldCheck className="text-green-500 shrink-0" size={24} />
                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                      פרטי האשראי שלכם מוצפנים. אנחנו לא שומרים את פרטי הכרטיס במערכת שלנו.
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isProcessing}
                    className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <>בצע תשלום מאובטח <ChevronLeft/></>}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center gap-10 h-full text-center">
                <div className="w-32 h-32 bg-green-500 text-white rounded-[40px] flex items-center justify-center shadow-2xl shadow-green-100 rotate-12">
                  <CheckCircle2 size={64} />
                </div>
                <div>
                  <h2 className="text-4xl font-black mb-4">התשלום בוצע בהצלחה!</h2>
                  <p className="text-slate-400 font-bold text-lg">אישור תשלום וחשבונית נשלחו למייל שלך.</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 w-full max-w-sm">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-400 font-bold">מספר אישור</span>
                    <span className="font-black">{transactionId || 'מתעבד...'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">סכום</span>
                    <span className="font-black">₪{order.amount.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase animate-pulse">מיד תחזרו לעמוד המקור...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


