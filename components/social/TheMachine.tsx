'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Image as ImageIcon, Loader2, 
  Search, ArrowRight, Zap, Facebook, Instagram, Linkedin, 
  MessageCircle, Globe, Video, Twitter, Share2, PinIcon, 
  MessageSquare, Wand
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { generatePostVariationsAction, generateAIImageAction } from '@/app/actions/ai-actions';
import { useApp } from '@/contexts/AppContext';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';
import { Client, PostVariation, SocialPost, SocialPlatform } from '@/types/social';
import { createPost, publishPost } from '@/app/actions/posts';
import { Avatar } from '@/components/Avatar';

interface VariationWithImage extends PostVariation {
  generatedImage?: string | null;
  isGeneratingImage?: boolean;
}

const PLATFORM_ICONS: Record<SocialPlatform, any> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Video,
  twitter: Twitter,
  google: Globe,
  whatsapp: MessageCircle,
  threads: Share2,
  youtube: Video,
  pinterest: PinIcon,
  portal: MessageSquare
};

export default function TheMachine() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getSocialBasePath(pathname);
  const { 
    clients, 
    activeDraft, 
    activeClientId, 
    activeClient,
    setActiveDraft,
    setPosts,
    addToast
  } = useApp();

  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [brief, setBrief] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [variations, setVariations] = useState<VariationWithImage[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<VariationWithImage | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [editableContent, setEditableContent] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setActiveDraft(null);
      setStep(1);
      setSelectedClient(null);
      setSelectedPlatforms([]);
      setBrief('');
      setClientSearchQuery('');
      setIsLoading(false);
      setVariations([]);
      setSelectedVariation(null);
      setEditableContent('');
      setIsGeneratingImage(false);
    };

    window.addEventListener('social:machine:new', handler as any);
    return () => {
      window.removeEventListener('social:machine:new', handler as any);
    };
  }, [setActiveDraft]);

  useEffect(() => {
    const cid = activeClientId || activeDraft?.clientId;
    if (cid) {
      const client = clients.find(c => c.id === cid);
      if (client) {
        setSelectedClient(client);
        setSelectedPlatforms(client.activePlatforms || ['facebook', 'instagram']);
      }
    }

    if (activeDraft) {
      setBrief(activeDraft.description || activeDraft.title);
      if (activeDraft.draftContent) setEditableContent(activeDraft.draftContent);
    }
  }, [activeDraft, activeClientId, clients]);

  const togglePlatformSelection = (id: SocialPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!selectedClient || !brief) return;
    setIsLoading(true);
    setStep(2);
    const results = await generatePostVariationsAction(brief, selectedClient.companyName, selectedClient.dna);
    setVariations(results.map(v => ({ ...v, generatedImage: null, isGeneratingImage: false })));
    setIsLoading(false);
  };

  const handleSelectVariation = (v: VariationWithImage) => {
    setSelectedVariation(v);
    setEditableContent(v.content);
    setStep(3);
    if (selectedPlatforms.length > 0) {
      setPreviewPlatform(selectedPlatforms[0]);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedVariation || !selectedClient) return;
    setIsGeneratingImage(true);
    const prompt = `Social media post about ${selectedClient.companyName}: ${selectedVariation.imageSuggestion || selectedVariation.content}`;
    const imageUrl = await generateAIImageAction(prompt);
    if (imageUrl) {
      setSelectedVariation(prev => prev ? { ...prev, generatedImage: imageUrl } : null);
    }
    setIsGeneratingImage(false);
  };

  const handleFinalize = async () => {
    if (!selectedClient || !selectedVariation) return;

    addToast('שולח לפרסום דרך Make/Zapier...', 'info');

    const created = await createPost({
      clientId: selectedClient.id,
      content: editableContent,
      platforms: selectedPlatforms,
      mediaUrl: selectedVariation.generatedImage || undefined,
      scheduledAt: new Date().toISOString(),
      status: 'draft',
    });

    if (!created.success || !created.data) {
      addToast(created.error || 'שגיאה ביצירת הפוסט', 'error');
      return;
    }

    const published = await publishPost(created.data.id);
    if (!published.success) {
      addToast(published.error || 'שגיאה בפרסום הפוסט', 'error');
      return;
    }

    const createdPost = created.data as SocialPost;
    const newPost: SocialPost = {
      ...createdPost,
      status: 'published',
      publishedAt: new Date().toISOString(),
    };

    setPosts((prev) => [newPost, ...prev]);
    addToast('הפוסט נשלח לפרסום ✅', 'success');
    setActiveDraft(null);
    router.push(joinPath(basePath, '/dashboard'));
  };

  const handleCancel = () => {
    setActiveDraft(null);
    router.push(joinPath(basePath, '/dashboard'));
  };

  const filteredClients = clients.filter(c => 
    c.companyName.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-full bg-slate-50/30 rounded-3xl md:rounded-[48px] overflow-hidden border border-slate-200 shadow-sm" dir="rtl">
      {/* Sidebar Steps */}
      <div className="w-full md:w-80 bg-white border-b md:border-l border-slate-200 p-6 md:p-8 flex flex-col z-10">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
            <Zap size={18} className="text-blue-600" /> פוסט בקליק
          </h2>
          <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-800">
            <X size={20}/>
          </button>
        </div>
        
        <div className="flex md:flex-col items-center md:items-start justify-center gap-4 md:gap-10 mt-2 md:mt-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 md:gap-5">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center font-black transition-all text-sm md:text-base ${
                step === s ? 'bg-slate-900 text-white shadow-lg md:shadow-xl' : 
                step > s ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-300'
              }`}>
                {s}
              </div>
              <span className={`hidden md:block font-black text-sm ${
                step === s ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {s === 1 ? 'מי ומה?' : s === 2 ? 'בוחרים הצעה' : 'ליטוש אחרון'}
              </span>
            </div>
          ))}
        </div>

        {selectedClient && (
          <div className="hidden md:flex mt-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                src={String(selectedClient.avatar || '')}
                name={String(selectedClient.companyName || selectedClient.name || '')}
                alt={String(selectedClient.companyName || '')}
                size="lg"
                rounded="xl"
              />
              <p className="font-black text-blue-900 truncate">{selectedClient.companyName}</p>
            </div>
            <button 
              onClick={() => { setSelectedClient(null); setStep(1); }} 
              className="text-[10px] font-black text-blue-600 hover:underline"
            >
              החלף לקוח
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 md:p-12 flex flex-col items-center justify-start overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="s1" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="max-w-3xl w-full flex flex-col gap-8 md:gap-10"
            >
              {!selectedClient && (
                <div className="flex flex-col gap-6 md:gap-8">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xl md:text-2xl font-black">עבור איזה לקוח הפוסט?</h3>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="חפש לקוח..." 
                        value={clientSearchQuery}
                        onChange={e => setClientSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-xl md:rounded-2xl py-3 md:py-4 px-10 md:px-12 text-base md:text-lg font-bold outline-none focus:ring-4 ring-blue-50 transition-all" 
                      />
                      <Search className="absolute right-3 md:right-4 top-3.5 md:top-5 text-slate-300" size={18} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                    {filteredClients.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => { 
                          setSelectedClient(c); 
                          setSelectedPlatforms(c.activePlatforms || ['facebook', 'instagram']); 
                        }} 
                        className="p-3 md:p-4 bg-white rounded-2xl md:rounded-3xl border border-slate-200 flex flex-col items-center gap-2 md:gap-3 hover:shadow-xl transition-all group"
                      >
                        <Avatar
                          src={String(c.avatar || '')}
                          name={String(c.companyName || c.name || '')}
                          alt={String(c.companyName || '')}
                          size="lg"
                          rounded="xl"
                          className="group-hover:scale-110 transition-transform"
                        />
                        <span className="font-black text-[10px] md:text-xs text-center line-clamp-1">{c.companyName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedClient && (
                <div className="flex flex-col gap-6 md:gap-8 animate-in slide-in-from-bottom w-full">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-lg md:text-2xl font-black">איפה מפרסמים?</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.activePlatforms.map(platform => {
                        const Icon = PLATFORM_ICONS[platform];
                        const isSelected = selectedPlatforms.includes(platform);
                        return (
                          <button 
                            key={platform} 
                            onClick={() => togglePlatformSelection(platform)}
                            className={`px-4 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs flex items-center gap-2 transition-all border-2 ${
                              isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-50'
                            }`}
                          >
                            <Icon size={14} /> <span className="capitalize">{platform}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h3 className="text-lg md:text-2xl font-black">מה הסיפור היום?</h3>
                    <textarea 
                      value={brief} 
                      onChange={e => setBrief(e.target.value)} 
                      placeholder="תיאור המבצע או הפוסט..." 
                      className="w-full h-32 md:h-48 p-5 md:p-8 bg-white border border-slate-200 rounded-2xl md:rounded-[32px] outline-none focus:border-slate-900 transition-all text-lg md:text-xl font-bold shadow-sm" 
                    />
                  </div>

                  <button 
                    onClick={handleGenerate} 
                    disabled={!brief || selectedPlatforms.length === 0} 
                    className="w-full py-4 md:py-6 bg-slate-900 text-white rounded-2xl md:rounded-[24px] font-black text-lg md:text-xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    צור סקיצות ✨
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="s2" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="max-w-6xl w-full"
            >
              <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-10 text-center">בחר את הגרסה המנצחת</h3>
              {isLoading ? (
                <div className="flex flex-col items-center py-24 gap-6">
                  <Loader2 className="animate-spin text-blue-600" size={48} />
                  <p className="font-black text-lg animate-pulse">ה-AI בונה וריאציות...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  {variations.map((v, idx) => (
                    <motion.div 
                      key={v.id} 
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-3xl md:rounded-[44px] border-2 border-slate-50 shadow-xl p-6 md:p-8 flex flex-col gap-4 md:gap-6 hover:border-blue-500 transition-all cursor-pointer group relative" 
                      onClick={() => handleSelectVariation(v)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg md:text-xl shadow-xl border-4 border-white transform -translate-y-2 -translate-x-2">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`px-3 py-1 rounded-lg font-black text-[9px] md:text-[10px] uppercase ${
                          v.type === 'sales' ? 'bg-red-50 text-red-600' : 
                          v.type === 'social' ? 'bg-blue-50 text-blue-600' : 
                          'bg-green-50 text-green-600'
                        }`}>
                          {v.type === 'sales' ? 'מכירתי' : v.type === 'social' ? 'מעורבות' : 'ערך'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-h-[100px] md:min-h-[160px]">
                        <p className="font-bold text-slate-700 leading-relaxed text-base md:text-lg italic">
                          "{v.content}"
                        </p>
                      </div>

                      <div className="pt-4 md:pt-6 border-t border-slate-200 flex items-center justify-between">
                        <button className="w-full bg-slate-900 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2">
                          בחר גרסה {String.fromCharCode(65 + idx)} <ArrowRight size={14}/>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && selectedVariation && (
            <motion.div 
              key="s3" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start"
            >
              {/* Preview */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="bg-white rounded-[40px] md:rounded-[56px] border-[8px] md:border-[12px] border-slate-300 shadow-2xl relative aspect-[9/18] w-full max-w-[260px] md:max-w-[300px] overflow-hidden">
                  <div className="p-3 md:p-4 border-b border-slate-200 font-black text-[10px] md:text-[11px] flex items-center gap-2">
                    <Avatar
                      src={String(selectedClient?.avatar || '')}
                      name={String(selectedClient?.companyName || selectedClient?.name || '')}
                      alt={String(selectedClient?.companyName || '')}
                      size="sm"
                      rounded="lg"
                      className="w-4 h-4 md:w-5 md:h-5"
                    />
                    {selectedClient?.companyName}
                  </div>
                  <div className="aspect-square bg-slate-100 flex items-center justify-center text-slate-200 relative overflow-hidden">
                    {isGeneratingImage ? (
                      <div className="absolute inset-0 bg-slate-900/10 flex flex-col items-center justify-center gap-4 z-10 backdrop-blur-sm">
                        <Loader2 className="animate-spin text-blue-600" size={32}/>
                        <span className="text-[10px] font-black uppercase text-blue-600 animate-pulse">מייצר תמונה...</span>
                      </div>
                    ) : null}
                    {selectedVariation.generatedImage ? (
                      <img src={selectedVariation.generatedImage} className="w-full h-full object-cover" alt="Generated" />
                    ) : (
                      <ImageIcon size={32}/>
                    )}
                  </div>
                  <div className="p-4 md:p-5 font-bold text-[10px] md:text-[12px] leading-relaxed text-slate-700">{editableContent}</div>
                </div>
                <div className="mt-6 md:mt-8 flex gap-2 p-2 bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
                  {selectedPlatforms.map(p => {
                    const Icon = PLATFORM_ICONS[p];
                    return (
                      <button 
                        key={p} 
                        onClick={() => setPreviewPlatform(p)} 
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                          previewPlatform === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'
                        }`}
                      >
                        <Icon size={20}/>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Controls */}
              <div className="lg:col-span-7 flex flex-col gap-6 md:gap-8 w-full">
                <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[44px] shadow-xl border border-slate-200 flex flex-col gap-4 md:gap-6">
                  <h4 className="text-lg md:text-xl font-black">ליטוש ודיוק</h4>
                  <textarea 
                    value={editableContent} 
                    onChange={e => setEditableContent(e.target.value)} 
                    className="w-full h-32 md:h-40 p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[28px] outline-none focus:border-slate-900 font-bold text-base md:text-lg leading-relaxed shadow-inner" 
                  />
                  
                  <div className="flex flex-col gap-4 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Wand className="text-blue-600" size={20}/>
                        <span className="font-black text-sm text-slate-800">ויז'ואל AI משלים</span>
                      </div>
                      <button 
                        onClick={handleGenerateImage} 
                        disabled={isGeneratingImage}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14}/>}
                        {selectedVariation.generatedImage ? 'ייצר שוב' : 'ייצר תמונה'}
                      </button>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">
                      ה-AI ייצר תמונה מותאמת אישית לתוכן הפוסט. מומלץ להשתמש בזה למבצעים מהירים או סיטואציות כלליות.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleFinalize} 
                  className="w-full py-5 md:py-6 bg-slate-900 text-white font-black text-xl md:text-2xl rounded-2xl md:rounded-[32px] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all"
                >
                  שגר לאוויר 🚀
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

