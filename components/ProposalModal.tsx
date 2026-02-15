
import React, { useState, useRef } from 'react';
import { Lead } from '../types';
import { 
    X, FileText, Send, Check, Plus, Trash2, Smartphone, 
    Link as LinkIcon, ExternalLink, Copy, CheckCircle2, 
    UploadCloud, PenTool, File as FileIcon, ChevronRight, Signature
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

declare const confetti: unknown;

interface ProposalModalProps {
  lead: Lead;
  onClose: () => void;
  onSend: (proposal: unknown) => void;
  onDealWon?: () => void;
}

interface LineItem {
    id: string;
    productId: string;
    name: string;
    price: number;
    qty: number;
    description?: string;
}

const CATALOG: { id: string; name: string; price: number; description?: string }[] = [];

const ProposalModal: React.FC<ProposalModalProps> = ({ lead, onClose, onSend, onDealWon }) => {
  const { addToast } = useToast();
  
  // Creation Mode: 'builder' (Smart items) or 'upload' (PDF/Doc)
  const [creationMode, setCreationMode] = useState<'builder' | 'upload'>('builder');
  
  // Builder State
  const [items, setItems] = useState<LineItem[]>([]);
  const [currency, setCurrency] = useState<'ILS' | 'USD'>('ILS');
  const [discount, setDiscount] = useState(0);
  const [validDays, setValidDays] = useState(7);
  const [personalNote, setPersonalNote] = useState('');

  // Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [step, setStep] = useState<'build' | 'share'>('build');
  const [generatedLink, setGeneratedLink] = useState('');
  
  // Signing Simulation State
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null); // To store the "signed" state

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;
  const vat = total * 0.17;
  const grandTotal = total + vat;

  // --- Handlers ---

  const addItem = (productId: string) => {
      const product = CATALOG.find(p => p.id === productId);
      if (product) {
          setItems([...items, { ...product, id: `item_${Date.now()}`, qty: 1, productId: product.id }]);
      }
  };

  const removeItem = (id: string) => {
      setItems(items.filter(i => i.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
      setItems(items.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setUploadedFile(e.target.files[0]);
          addToast('הקובץ נטען בהצלחה', 'success');
      }
  };

  const handleGenerateLink = () => {
      addToast('הפקת קישור להצעה לא זמינה (נדרשת אינטגרציה)', 'info');
      return;
      // Validation
      if (creationMode === 'upload' && !uploadedFile) {
          addToast('יש להעלות קובץ לפני הפקת קישור', 'error');
          return;
      }
      if (creationMode === 'builder' && items.length === 0) {
          addToast('יש להוסיף לפחות מוצר אחד', 'error');
          return;
      }

  };

  const simulateClientSignature = () => {
      addToast('חתימה דיגיטלית לא זמינה (נדרשת אינטגרציה)', 'info');
  };

  const copyLink = () => {
      navigator.clipboard.writeText(generatedLink);
      addToast('הקישור הועתק ללוח', 'success');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex justify-center items-center p-4 animate-fade-in">
      <div 
        className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row ring-1 ring-white/10 animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* === RIGHT SIDE: THE BUILDER (Config) === */}
        <div className="w-full md:w-[45%] bg-slate-50 border-l border-slate-200 flex flex-col h-full relative z-20">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-white">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <FileText size={22} className="text-indigo-600" />
                        הסכם עבודה
                    </h3>
                    <button onClick={onClose} className="md:hidden text-slate-400"><X size={20} /></button>
                </div>
                <p className="text-sm text-slate-500 font-medium">יצירת הצעה וחתימה עבור {lead.name}</p>
            </div>

            {/* Mode Switcher */}
            <div className="px-6 pt-6">
                <div className="bg-slate-200 p-1 rounded-xl flex">
                    <button 
                        onClick={() => setCreationMode('builder')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${creationMode === 'builder' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        בנה הצעה חכמה
                    </button>
                    <button 
                        onClick={() => setCreationMode('upload')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${creationMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        העלה קובץ מוכן
                    </button>
                </div>
            </div>

            {/* Config Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* --- MODE A: BUILDER --- */}
                {creationMode === 'builder' && (
                    <>
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">מוצרים ושירותים</label>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                                {CATALOG.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => addItem(p.id)}
                                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-1 shadow-sm"
                                    >
                                        <Plus size={12} /> {p.name}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                {items.length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                                        לא נבחרו מוצרים. בחר מהרשימה למעלה.
                                    </div>
                                )}
                                {items.map((item, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 group animate-fade-in">
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={() => updateQty(item.id, 1)} className="text-slate-400 hover:text-indigo-600"><Plus size={12} /></button>
                                            <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, -1)} className="text-slate-400 hover:text-indigo-600"><ChevronRight size={12} className="rotate-90" /></button>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-sm text-slate-800">{item.name}</div>
                                            <div className="text-xs text-slate-500">{item.description}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-slate-700">₪{(item.price * item.qty).toLocaleString()}</div>
                                            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                                                <Trash2 size={10} /> הסר
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Personalization */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">התאמה אישית (פתיח)</label>
                            <textarea 
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none h-24"
                                placeholder="כתוב כאן הודעה אישית ללקוח שתופיע בראש ההצעה..."
                                value={personalNote}
                                onChange={(e) => setPersonalNote(e.target.value)}
                            />
                        </div>

                        {/* Terms */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
                            <div>
                                <label className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                    <span>הנחה מיוחדת</span>
                                    <span className="text-indigo-600 bg-indigo-50 px-2 rounded">{discount}%</span>
                                </label>
                                <input 
                                    type="range" min="0" max="25" step="5" 
                                    value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">תוקף הצעה</label>
                                    <select 
                                        value={validDays} 
                                        onChange={(e) => setValidDays(Number(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                                    >
                                        <option value={3}>3 ימים (דחוף)</option>
                                        <option value={7}>7 ימים (רגיל)</option>
                                        <option value={30}>30 ימים</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">מטבע</label>
                                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                        <button onClick={() => setCurrency('ILS')} className={`flex-1 rounded-lg text-xs font-bold py-1.5 ${currency === 'ILS' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>₪ ILS</button>
                                        <button onClick={() => setCurrency('USD')} className={`flex-1 rounded-lg text-xs font-bold py-1.5 ${currency === 'USD' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>$ USD</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* --- MODE B: UPLOAD --- */}
                {creationMode === 'upload' && (
                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${uploadedFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-100'}`}
                        >
                            <input type="file" className="hidden" ref={fileInputRef} accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
                            
                            {uploadedFile ? (
                                <>
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <FileIcon size={32} />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-800">{uploadedFile.name}</p>
                                        <p className="text-xs text-slate-500">לחץ להחלפה</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                                        <UploadCloud size={32} />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-600">גרור קובץ לכאן</p>
                                        <p className="text-xs text-slate-400">PDF, DOCX עד 10MB</p>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-800 w-full">
                            <strong>שים לב:</strong> בהעלאת קובץ חיצוני, אנו מוסיפים אוטומטית עמוד חתימה דיגיטלית בסוף המסמך.
                        </div>
                    </div>
                )}

            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-30">
                {step === 'build' ? (
                    <div className="space-y-4">
                        {creationMode === 'builder' && (
                            <div className="flex justify-between items-end">
                                <span className="text-slate-500 text-sm font-medium">סה"כ לתשלום (כולל מע"מ):</span>
                                <span className="text-2xl font-black text-slate-900 tracking-tight">
                                    {currency === 'ILS' ? '₪' : '$'}{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        )}
                        <button 
                            onClick={handleGenerateLink}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5"
                        >
                            <LinkIcon size={18} /> הפק קישור לחתימה
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-slide-up">
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-3">
                            <div className="bg-white p-2 rounded-full text-emerald-600 shadow-sm"><Check size={16} /></div>
                            <div>
                                <div className="font-bold text-emerald-800 text-sm">המסמך מוכן לחתימה!</div>
                                <div className="text-xs text-emerald-600">תוקף: {validDays} ימים</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input type="text" readOnly value={generatedLink} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-600 font-mono" />
                            <button onClick={copyLink} className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600"><Copy size={18} /></button>
                        </div>
                        <button 
                            onClick={() => { const lr = lead as unknown as Record<string, unknown>; return window.open(`https://wa.me/${String(lr?.phone ?? '').replace(/-/g, '')}?text=${encodeURIComponent(`היי ${String(lr?.name ?? '').split(' ')[0]}, הנה הסכם העבודה לחתימה דיגיטלית: ${generatedLink}`)}`, '_blank'); }}
                            className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-xl hover:bg-[#128C7E] transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <Send size={18} /> שלח בוואטסאפ
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* === LEFT SIDE: CLIENT PREVIEW === */}
        <div className="w-full md:w-[55%] bg-slate-800 p-4 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="text-white/60 font-bold uppercase tracking-[0.2em] text-xs mb-6 flex items-center gap-2">
                <Smartphone size={14} /> תצוגה מקדימה ללקוח
            </div>

            {/* Mobile Device Frame */}
            <div className="w-full max-w-[375px] h-[700px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative border-8 border-slate-900 flex flex-col animate-float-in">
                
                {/* Dynamic Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#FAFAFA]">
                    
                    {/* 1. Hero */}
                    <div className="h-40 bg-slate-900 relative p-6 flex flex-col justify-end text-white">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">
                                {creationMode === 'upload' ? 'מסמך מצורף' : 'הצעת מחיר'}
                            </div>
                            <h1 className="text-xl font-black leading-tight">{lead.company || lead.name}</h1>
                            <div className="mt-2 inline-block px-2 py-1 bg-white/10 rounded text-[10px] font-mono backdrop-blur-sm">
                                {new Date().toLocaleDateString('he-IL')}
                            </div>
                        </div>
                    </div>

                    {/* Content Body */}
                    {creationMode === 'upload' && uploadedFile ? (
                        <div className="p-6 flex flex-col items-center justify-center h-64 text-slate-400">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                                <FileText size={32} />
                            </div>
                            <p className="font-bold text-slate-600">{uploadedFile.name}</p>
                            <p className="text-xs mt-1">תצוגה מקדימה של הקובץ...</p>
                        </div>
                    ) : (
                        // Builder Preview
                        <>
                            {personalNote && (
                                <div className="p-6 pb-2">
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-slate-700 italic relative">
                                        <div className="absolute top-[-8px] right-4 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 rounded">הערה אישית</div>
                                        "{personalNote}"
                                    </div>
                                </div>
                            )}

                            <div className="px-4 py-4">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase">פירוט השירותים</span>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {items.map((item, i) => (
                                            <div key={i} className="p-4 flex justify-between items-start">
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{item.name}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">כמות: {item.qty}</div>
                                                </div>
                                                <div className="text-sm font-mono font-bold text-slate-700">
                                                    {currency === 'ILS' ? '₪' : '$'}{(item.price * item.qty).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Summary */}
                                    <div className="bg-slate-50 p-4 space-y-2 border-t border-slate-100">
                                        <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200">
                                            <span>סה"כ</span>
                                            <span>{currency === 'ILS' ? '₪' : '$'}{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Digital Signature Area */}
                    <div className="p-4 mt-4">
                        <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${signature ? 'border-emerald-400 bg-emerald-50' : 'border-indigo-200 bg-white'}`}>
                            {signature ? (
                                <div className="animate-scale-in">
                                    <div className="font-brand text-3xl text-emerald-800 transform -rotate-3 mb-2 font-cursive" style={{fontFamily: 'cursive'}}>
                                        {signature}
                                    </div>
                                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                        <CheckCircle2 size={12} /> נחתם דיגיטלית
                                    </div>
                                    <div className="text-[9px] text-emerald-500 mt-1 font-mono">IP: 84.12.11.9 • {new Date().toLocaleTimeString()}</div>
                                </div>
                            ) : (
                                <div>
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <PenTool size={18} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">איזור חתימה</p>
                                    <div className="h-16 border-b border-slate-200"></div>
                                    <p className="text-[10px] text-slate-400 mt-2">הלקוח חותם כאן (באצבע או עכבר)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-24"></div>
                </div>

                {/* Sticky Footer (Client Action) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-slate-100 z-20">
                    <button 
                        onClick={simulateClientSignature}
                        disabled={isSigning || signature !== null}
                        className={`w-full py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                            signature 
                            ? 'bg-emerald-500 text-white cursor-default'
                            : isSigning 
                            ? 'bg-slate-700 text-white' 
                            : 'bg-slate-900 text-white'
                        }`}
                    >
                        {signature ? (
                            <>
                                <Check size={18} /> המסמך חתום ומאושר
                            </>
                        ) : isSigning ? (
                            <>
                                <CheckCircle2 size={18} className="animate-ping" /> מאמת חתימה...
                            </>
                        ) : (
                            <>
                                <Signature size={18} /> לחץ לאישור וחתימה
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-colors hidden md:block z-50">
            <X size={24} />
        </button>

      </div>
    </div>
  );
};

export default ProposalModal;
