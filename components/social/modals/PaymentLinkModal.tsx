'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Link as LinkIcon, Copy, Check, Send, User, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { PaymentOrder } from '@/types/social';
import { Avatar } from '@/components/Avatar';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

export default function PaymentLinkModal() {
  const { 
    isPaymentModalOpen, 
    setIsPaymentModalOpen, 
    clients, 
    activeClientId,
    setTasks,
    addToast 
  } = useApp();
  useBackButtonClose(isPaymentModalOpen, () => setIsPaymentModalOpen(false));

  const [step, setStep] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPaymentModalOpen) {
      setStep(1);
      const initialId = activeClientId || clients[0]?.id || '';
      setSelectedClientId(initialId);
      setAmount('');
      setDescription('');
      setGeneratedLink('');
      
      const client = clients.find(c => c.id === initialId);
      if (client?.nextPaymentAmount) {
        setAmount(client.nextPaymentAmount.toString());
        setDescription(`ריטיינר סושיאל - ${new Date(client.nextPaymentDate || '').toLocaleDateString('he-IL', { month: 'long' })}`);
      }
    }
  }, [isPaymentModalOpen, activeClientId, clients]);

  if (!isPaymentModalOpen) return null;

  const handleGenerate = async () => {
    try {
      const { createPaymentOrder } = await import('@/app/actions/payments');
      const result = await createPaymentOrder(
        selectedClientId,
        parseFloat(amount),
        description || 'שירותי סושיאל מדיה',
        2
      );
      
      if (result.success && result.data) {
        const order = result.data;
        const token = btoa(JSON.stringify({ orderId: order.id, clientId: order.clientId }));
        setGeneratedLink(`${window.location.origin}/pay/${token}`);
        setStep(2);
        
        // Create task
        const newTask = {
          id: `task-pay-${order.id}`,
          clientId: order.clientId,
          title: `תשלום ממתין: ${order.description}`,
          description: `נשלח לינק על סך ₪${order.amount}`,
          dueDate: 'היום',
          priority: 'high' as const,
          status: 'todo' as const,
          type: 'payment' as const
        };
        
        setTasks(prev => [newTask, ...prev]);
        addToast('הזמנת תשלום נוצרה בהצלחה!');
      } else {
        addToast(result.error || 'שגיאה ביצירת הזמנת תשלום', 'error');
      }
    } catch (error) {
      console.error('Payment order creation error:', error);
      addToast('שגיאה ביצירת הזמנת תשלום', 'error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('הקישור הועתק!');
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const useNextPayment = () => {
    if (selectedClient?.nextPaymentAmount) {
      setAmount(selectedClient.nextPaymentAmount.toString());
      setDescription(`ריטיינר סושיאל - ${new Date(selectedClient.nextPaymentDate || '').toLocaleDateString('he-IL', { month: 'long' })}`);
    }
  };

  const reset = () => {
    setIsPaymentModalOpen(false);
    setTimeout(() => {
      setStep(1);
      setAmount('');
      setDescription('');
      setGeneratedLink('');
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={reset}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="p-8 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500 text-white rounded-2xl shadow-lg">
              <DollarSign size={24}/>
            </div>
            <h2 className="text-2xl font-black">יצירת לינק לתשלום</h2>
          </div>
          <button onClick={reset} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={24}/>
          </button>
        </div>

        <div className="p-10 flex-1">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
                {!activeClientId && (
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">בחר לקוח</label>
                    <div className="grid grid-cols-2 gap-3">
                      {clients.map(c => (
                        <button 
                          key={c.id} 
                          onClick={() => setSelectedClientId(c.id)} 
                          className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                            selectedClientId === c.id ? 'border-slate-900 bg-slate-50' : 'border-slate-100'
                          }`}
                        >
                          <Avatar
                            src={String(c.avatar || '')}
                            name={String(c.companyName || c.name || '')}
                            alt={String(c.companyName || '')}
                            size="md"
                            rounded="lg"
                          />
                          <span className="font-black text-sm">{c.companyName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">סכום (₪)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-2xl font-black outline-none focus:ring-4 ring-green-50"
                    placeholder="0"
                  />
                  {selectedClient?.nextPaymentAmount && (
                    <button 
                      onClick={useNextPayment}
                      className="text-sm font-black text-green-600 hover:underline"
                    >
                      השתמש בתשלום הבא: ₪{selectedClient.nextPaymentAmount}
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">תיאור</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-black outline-none focus:ring-4 ring-green-50"
                    placeholder="תיאור התשלום"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!selectedClientId || !amount}
                  className="w-full bg-green-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-4 disabled:opacity-50"
                >
                  <LinkIcon size={24} />
                  צור לינק תשלום
                </button>
              </motion.div>
            ) : (
              <motion.div key="s2" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center gap-8 py-4">
                <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-100">
                  <Check size={40} />
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-2">לינק התשלום מוכן!</h3>
                  <p className="text-slate-400 font-bold max-w-sm mx-auto">
                    שלח את הלינק ללקוח כדי שיוכל לשלם בקלות
                  </p>
                </div>

                <div className="w-full bg-slate-50 p-8 rounded-[40px] border border-slate-200 flex flex-col gap-4">
                  <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 w-full font-black text-green-600 truncate text-center select-all">
                    {generatedLink}
                  </div>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={handleCopy}
                      className={`flex-1 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${
                        copied ? 'bg-green-500 text-white' : 'bg-green-600 text-white shadow-lg shadow-green-100'
                      }`}
                    >
                      {copied ? <><Check size={24}/> הועתק!</> : <><Copy size={24}/> העתק</>}
                    </button>
                    <button 
                      onClick={() => {
                        const text = encodeURIComponent(`היי, שלחתי לך לינק לתשלום: ${generatedLink}`);
                        window.open(`https://wa.me/?text=${text}`, '_blank');
                      }}
                      className="flex-1 py-5 bg-green-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-green-100 hover:bg-green-600 transition-all"
                    >
                      <Send size={24}/> וואטסאפ
                    </button>
                  </div>
                </div>

                <button onClick={reset} className="text-slate-400 font-bold hover:text-slate-600 underline text-xs">
                  סיום
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

