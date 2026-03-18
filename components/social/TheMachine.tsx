'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Image, 
  Search, ArrowRight, Zap, Facebook, Instagram, Linkedin, 
  MessageCircle, Globe, Video, Twitter, Share2, Pin, 
  MessageSquare, Wand, Clock, CalendarPlus, BookmarkPlus, Check
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { generatePostVariationsAction, generateAIImageAction } from '@/app/actions/ai-actions';
import { suggestBestPostingTimes, type PostingTimesResult } from '@/app/actions/social-posting-times';
import { useSocialData } from '@/contexts/SocialDataContext';
import { useSocialUI } from '@/contexts/SocialUIContext';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';
import { Client, PostVariation, SocialPost, SocialPlatform } from '@/types/social';
import { createPost, publishPost, updatePost } from '@/app/actions/posts';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/ui/skeletons';
import { useApp } from '@/contexts/AppContext';

interface VariationWithImage extends PostVariation {
  generatedImage?: string | null;
  isGeneratingImage?: boolean;
}

const DEFAULT_PLATFORMS: SocialPlatform[] = ['facebook', 'instagram', 'linkedin', 'tiktok'];

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
  pinterest: Pin,
  portal: MessageSquare
};

export default function TheMachine() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getSocialBasePath(pathname);
  const { clients, posts, activeDraft, activeClientId, activeClient, setActiveDraft, setPosts } = useSocialData();
  const { addToast } = useSocialUI();
  const { orgSlug } = useApp();

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
  const [postingTimes, setPostingTimes] = useState<PostingTimesResult | null>(null);
  const [showTimesModal, setShowTimesModal] = useState(false);
  const [imageSize, setImageSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [scheduledDate, setScheduledDate] = useState('');
  const [showScheduleInput, setShowScheduleInput] = useState(false);

  const editingPostId = String((activeDraft as Record<string, unknown> | null)?.id || '').trim();
  const editingPost = editingPostId && !editingPostId.startsWith('draft-') ? posts.find((p) => String(p.id) === editingPostId) : undefined;
  const isEditingExistingPost = Boolean(editingPost?.id);

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
      setImageSize('1024x1024');
      setScheduledDate('');
      setShowScheduleInput(false);
    };

    window.addEventListener('social:machine:new', handler as EventListener);
    return () => {
      window.removeEventListener('social:machine:new', handler as EventListener);
    };
  }, [setActiveDraft]);

  useEffect(() => {
    const cid = activeClientId || activeDraft?.clientId;
    if (cid) {
      const client = clients.find(c => c.id === cid);
      if (client) {
        setSelectedClient(client);
        if (isEditingExistingPost && editingPost?.platforms?.length) {
          setSelectedPlatforms(editingPost.platforms);
        } else {
          setSelectedPlatforms(
            Array.isArray(client.activePlatforms) && client.activePlatforms.length > 0
              ? client.activePlatforms
              : DEFAULT_PLATFORMS
          );
        }
      }
    }

    if (activeDraft) {
      setBrief(activeDraft.description || activeDraft.title);
      if (activeDraft.draftContent) {
        setEditableContent(activeDraft.draftContent);
      } else if (isEditingExistingPost && editingPost?.content) {
        setEditableContent(editingPost.content);
      }
    }
  }, [activeDraft, activeClientId, clients, editingPost?.content, editingPost?.platforms, isEditingExistingPost]);

  // Load posting time recommendations when platforms change
  useEffect(() => {
    if (selectedPlatforms.length > 0) {
      suggestBestPostingTimes({ 
        platforms: selectedPlatforms,
        isReligious: false // TODO: Add isShabbatProtected to Client type if needed
      }).then(setPostingTimes);
    }
  }, [selectedPlatforms]);

  const togglePlatformSelection = (id: SocialPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    console.log('[OneClick] Step 2 state check:', {
      isLoading,
      variationsCount: variations?.length,
      hasSelectedVariation: !!selectedVariation,
      step,
      hasClient: !!selectedClient,
    });
  }, [isLoading, variations, selectedVariation, step, selectedClient]);

  const handleGenerate = async () => {
    if (!selectedClient || !brief) return;
    
    console.log('[OneClick] Starting generation...', {
      clientId: selectedClient?.id,
      hasDna: !!selectedClient?.dna,
      dnaKeys: selectedClient?.dna ? Object.keys(selectedClient.dna) : [],
      briefLength: brief?.length,
      companyName: selectedClient?.companyName,
    });
    
    setIsLoading(true);
    setStep(2);
    try {
      const results = await generatePostVariationsAction(brief, selectedClient.companyName, selectedClient.dna);
      console.log('[OneClick] Received results:', {
        count: results?.length,
        firstResult: results?.[0] ? { id: results[0].id, type: results[0].type, contentLength: results[0].content?.length } : null,
      });
      setVariations(results.map(v => ({ ...v, generatedImage: null, isGeneratingImage: false })));
    } catch (error) {
      console.error('[OneClick] Generation failed:', error);
    } finally {
      setIsLoading(false);
    }
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
    const prompt = `Create a visually stunning social media image for the brand "${selectedClient.companyName}": ${selectedVariation.imageSuggestion || selectedVariation.content}. Style: modern, clean, professional. No text overlay in the image.`;
    const imageUrl = await generateAIImageAction(prompt, imageSize);
    if (imageUrl) {
      setSelectedVariation(prev => prev ? { ...prev, generatedImage: imageUrl } : null);
      addToast('התמונה נוצרה בהצלחה! 🎨', 'success');
    } else {
      addToast('לא הצלחנו ליצור תמונה. נסה שוב.', 'error');
    }
    setIsGeneratingImage(false);
  };

  const handleFinalize = async () => {
    if (!selectedClient) return;
    if (!selectedVariation && !isEditingExistingPost) return;

    addToast('שולח לפרסום דרך Make/Zapier...', 'info');

    if (!orgSlug) {
      addToast('יש לבחור ארגון לפני יצירת פוסט', 'error');
      return;
    }

    if (isEditingExistingPost && editingPost?.id) {
      const mediaUrl = selectedVariation?.generatedImage || editingPost.mediaUrl || undefined;
      const updated = await updatePost(editingPost.id, {
        orgSlug,
        content: editableContent,
        platforms: selectedPlatforms,
        mediaUrl,
        scheduledAt: editingPost.scheduledAt || undefined,
        status: editingPost.status,
      });

      if (!updated.success) {
        addToast(updated.error || 'שגיאה בעדכון הפוסט', 'error');
        return;
      }

      const shouldPublish = String(editingPost.status || '') !== 'published';
      if (shouldPublish) {
        const published = await publishPost(editingPost.id, orgSlug);
        if (!published.success) {
          addToast(published.error || 'שגיאה בפרסום הפוסט', 'error');
          return;
        }
      }

      const publishedAt = shouldPublish ? new Date().toISOString() : editingPost.publishedAt;
      setPosts((prev) =>
        (Array.isArray(prev) ? prev : []).map((p) =>
          String(p.id) === String(editingPost.id)
            ? {
                ...p,
                ...(updated.data ? (updated.data as SocialPost) : {}),
                content: editableContent,
                platforms: selectedPlatforms,
                mediaUrl,
                status: shouldPublish ? 'published' : p.status,
                publishedAt: publishedAt || p.publishedAt,
              }
            : p
        )
      );

      addToast('הפוסט עודכן ✅', 'success');
      setActiveDraft(null);
      router.push(joinPath(basePath, '/dashboard'));
      return;
    }

    const created = await createPost({
      orgSlug,
      clientId: selectedClient.id,
      content: editableContent,
      platforms: selectedPlatforms,
      mediaUrl: selectedVariation?.generatedImage || undefined,
      scheduledAt: new Date().toISOString(),
      status: 'draft',
    });

    if (!created.success || !created.data) {
      addToast(created.error || 'שגיאה ביצירת הפוסט', 'error');
      return;
    }

    const published = await publishPost(created.data.id, orgSlug);
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

  const handleSaveToContentBank = async () => {
    if (!selectedClient || !editableContent) return;
    if (!orgSlug) {
      addToast('יש לבחור ארגון', 'error');
      return;
    }
    const created = await createPost({
      orgSlug,
      clientId: selectedClient.id,
      content: editableContent,
      platforms: selectedPlatforms,
      mediaUrl: selectedVariation?.generatedImage || undefined,
      status: 'draft',
    });
    if (!created.success) {
      addToast(created.error || 'שגיאה בשמירה', 'error');
      return;
    }
    if (created.data) {
      setPosts(prev => [created.data as SocialPost, ...prev]);
    }
    addToast('נשמר לבנק התכנים בהצלחה! 📂', 'success');
    setActiveDraft(null);
    router.push(joinPath(basePath, '/content-bank'));
  };

  const handleSchedulePost = async () => {
    if (!selectedClient || !editableContent) return;
    if (!orgSlug) {
      addToast('יש לבחור ארגון', 'error');
      return;
    }
    if (!scheduledDate) {
      addToast('יש לבחור תאריך ושעה לפרסום', 'error');
      return;
    }
    const created = await createPost({
      orgSlug,
      clientId: selectedClient.id,
      content: editableContent,
      platforms: selectedPlatforms,
      mediaUrl: selectedVariation?.generatedImage || undefined,
      scheduledAt: new Date(scheduledDate).toISOString(),
      status: 'scheduled',
    });
    if (!created.success) {
      addToast(created.error || 'שגיאה בתזמון', 'error');
      return;
    }
    if (created.data) {
      setPosts(prev => [created.data as SocialPost, ...prev]);
    }
    addToast('הפוסט תוזמן בהצלחה! ⏰', 'success');
    setActiveDraft(null);
    router.push(joinPath(basePath, '/calendar'));
  };

  const filteredClients = clients.filter(c => 
    c.companyName.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-full bg-slate-50/30 rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 shadow-sm" dir="rtl">
      {/* Sidebar Steps */}
      <div className="w-full md:w-72 bg-white border-b md:border-l border-slate-200 p-4 md:p-6 flex flex-col z-10">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Zap size={18} className="text-indigo-600" /> פוסט בקליק
          </h2>
          <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-800">
            <X size={20}/>
          </button>
        </div>
        
        <div className="flex md:flex-col items-center md:items-start justify-center gap-4 md:gap-10 mt-2 md:mt-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 md:gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all text-sm ${
                step === s ? 'bg-slate-900 text-white shadow-md' : 
                step > s ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {s}
              </div>
              <span className={`hidden md:block font-bold text-sm ${
                step === s ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {s === 1 ? 'מי ומה?' : s === 2 ? 'בוחרים הצעה' : 'ליטוש אחרון'}
              </span>
            </div>
          ))}
        </div>

        {selectedClient && (
          <div className="hidden md:flex mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar
                src={String(selectedClient.avatar || '')}
                name={String(selectedClient.companyName || selectedClient.name || '')}
                alt={String(selectedClient.companyName || '')}
                size="md"
                rounded="lg"
              />
              <p className="font-bold text-indigo-900 truncate text-sm">{selectedClient.companyName}</p>
            </div>
            <button 
              onClick={() => { setSelectedClient(null); setStep(1); }} 
              className="text-[10px] font-bold text-indigo-600 hover:underline"
            >
              החלף לקוח
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-start overflow-y-auto">
        <AnimatePresence mode="sync">
          {step === 1 && (
            <motion.div 
              key="s1" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="max-w-3xl w-full flex flex-col gap-6 md:gap-8"
            >
              {!selectedClient && (
                <div className="flex flex-col gap-4 md:gap-6">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xl md:text-2xl font-bold">עבור איזה לקוח הפוסט?</h3>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="חפש לקוח..." 
                        value={clientSearchQuery}
                        onChange={e => setClientSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 md:py-3 px-10 md:px-12 text-sm md:text-base font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" 
                      />
                      <Search className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                    {filteredClients.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => { 
                          setSelectedClient(c); 
                          setSelectedPlatforms(
                            Array.isArray(c.activePlatforms) && c.activePlatforms.length > 0
                              ? c.activePlatforms
                              : DEFAULT_PLATFORMS
                          ); 
                        }} 
                        className="p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-slate-200 flex flex-col items-center gap-2 md:gap-3 hover:shadow-md transition-all group"
                      >
                        <Avatar
                          src={String(c.avatar || '')}
                          name={String(c.companyName || c.name || '')}
                          alt={String(c.companyName || '')}
                          size="md"
                          rounded="lg"
                          className="group-hover:scale-105 transition-transform"
                        />
                        <span className="font-bold text-[11px] md:text-xs text-center line-clamp-1">{c.companyName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedClient && (
                <div className="flex flex-col gap-6 md:gap-8 animate-in slide-in-from-bottom w-full">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-lg md:text-xl font-bold">איפה מפרסמים?</h3>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(selectedClient.activePlatforms) && selectedClient.activePlatforms.length > 0
                        ? selectedClient.activePlatforms
                        : DEFAULT_PLATFORMS
                      ).map(platform => {
                        const Icon = PLATFORM_ICONS[platform];
                        const isSelected = selectedPlatforms.includes(platform);
                        return (
                          <button 
                            key={platform} 
                            onClick={() => togglePlatformSelection(platform)}
                            className={`px-4 md:px-5 py-2 md:py-2.5 rounded-full font-bold text-[11px] md:text-xs flex items-center gap-2 transition-all border ${
                              isSelected ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Icon size={14} /> <span className="capitalize">{platform}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h3 className="text-lg md:text-xl font-bold">מה הסיפור היום?</h3>
                    <textarea 
                      value={brief} 
                      onChange={e => setBrief(e.target.value)} 
                      placeholder="תיאור המבצע או הפוסט..." 
                      className="w-full h-32 p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base md:text-lg font-medium shadow-sm resize-none" 
                    />
                  </div>

                  <button 
                    onClick={handleGenerate} 
                    disabled={!brief || !brief.trim()} 
                    className="w-full py-3.5 md:py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-base md:text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <h3 className="text-xl font-bold mb-6 text-center">בחר את הגרסה המנצחת</h3>
              {isLoading ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <Skeleton className="w-12 h-12 rounded-full bg-indigo-100" />
                  <p className="font-bold text-base text-slate-600">ה-AI בונה וריאציות...</p>
                </div>
              ) : variations.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-5">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                    <Sparkles size={32} className="text-slate-300" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-slate-700 mb-1">לא נמצאו וריאציות</p>
                    <p className="text-sm font-medium text-slate-500">נסה ליצור סקיצות שוב או לשנות את התיאור</p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm"
                  >
                    חזור ונסה שוב
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {variations.map((v, idx) => (
                    <motion.div 
                      key={v.id} 
                      whileHover={{ y: -2 }}
                      className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-5 md:p-6 flex flex-col gap-4 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group relative" 
                      onClick={() => handleSelectVariation(v)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm border-[3px] border-white transform -translate-y-2 -translate-x-2">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wide ${
                          v.type === 'sales' ? 'bg-rose-50 text-rose-600' : 
                          v.type === 'social' ? 'bg-indigo-50 text-indigo-600' : 
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {v.type === 'sales' ? 'מכירתי' : v.type === 'social' ? 'מעורבות' : 'ערך'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-h-[120px] max-h-[250px] overflow-y-auto scrollbar-thin">
                        <p className="font-medium text-slate-700 leading-relaxed text-sm whitespace-pre-wrap break-words" dir="rtl">
                          {v.content}
                        </p>
                      </div>

                      {/* Suggested Hashtags */}
                      {v.suggestedHashtags && (
                        <div className="flex flex-col gap-1.5 mt-2">
                          <div className="flex items-center gap-1.5">
                            <Wand size={12} className="text-purple-500" />
                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Hashtags</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const allTags = new Set<string>();
                              selectedPlatforms.forEach(platform => {
                                const h = platform === 'facebook' ? v.suggestedHashtags?.facebook :
                                          platform === 'instagram' ? v.suggestedHashtags?.instagram :
                                          platform === 'linkedin' ? v.suggestedHashtags?.linkedin :
                                          v.suggestedHashtags?.general;
                                h?.forEach(tag => allTags.add(tag.startsWith('#') ? tag : `#${tag}`));
                              });
                              if (v.suggestedHashtags?.general) {
                                v.suggestedHashtags.general.forEach(tag => allTags.add(tag.startsWith('#') ? tag : `#${tag}`));
                              }
                              return Array.from(allTags).slice(0, 8).map((tag, i) => (
                                <span 
                                  key={i}
                                  className="px-1.5 py-0.5 bg-purple-50/50 text-purple-600 rounded text-[9px] font-medium border border-purple-100/50"
                                >
                                  {tag}
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <button className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-600">
                          בחר גרסה {String.fromCharCode(65 + idx)} <ArrowRight size={14} className="group-hover:-translate-x-1 transition-transform"/>
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
                <div className="bg-white rounded-[32px] md:rounded-[40px] border-[6px] md:border-[8px] border-slate-200 shadow-xl relative aspect-[9/18] w-full max-w-[260px] md:max-w-[280px] overflow-hidden">
                  <div className="p-3 border-b border-slate-100 font-bold text-[10px] md:text-[11px] flex items-center gap-2">
                    <Avatar
                      src={String(selectedClient?.avatar || '')}
                      name={String(selectedClient?.companyName || selectedClient?.name || '')}
                      alt={String(selectedClient?.companyName || '')}
                      size="sm"
                      rounded="lg"
                      className="w-5 h-5"
                    />
                    <span className="truncate">{selectedClient?.companyName}</span>
                  </div>
                  <div className="aspect-square bg-slate-50 flex items-center justify-center text-slate-300 relative overflow-hidden border-b border-slate-100">
                    {isGeneratingImage ? (
                      <div className="absolute inset-0 bg-slate-900/5 flex flex-col items-center justify-center gap-3 z-10 backdrop-blur-sm">
                        <Skeleton className="w-8 h-8 rounded-full bg-indigo-100" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">מייצר תמונה...</span>
                      </div>
                    ) : null}
                    {selectedVariation.generatedImage ? (
                      <img src={selectedVariation.generatedImage} className="w-full h-full object-cover" alt="Generated" />
                    ) : (
                      <Image size={24}/>
                    )}
                  </div>
                  <div className="p-4 font-medium text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words overflow-y-auto max-h-[140px] custom-scrollbar">{editableContent}</div>
                </div>
                <div className="mt-6 flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
                  {selectedPlatforms.map(p => {
                    const Icon = PLATFORM_ICONS[p];
                    return (
                      <button 
                        key={p} 
                        onClick={() => setPreviewPlatform(p)} 
                        className={`p-2.5 rounded-xl transition-all ${
                          previewPlatform === p ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={18}/>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Controls */}
              <div className="lg:col-span-7 flex flex-col gap-6 w-full">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col gap-5">
                  <h4 className="text-lg font-bold text-slate-900">ליטוש ודיוק</h4>
                  <textarea 
                    value={editableContent} 
                    onChange={e => setEditableContent(e.target.value)} 
                    className="w-full h-32 md:h-40 p-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm md:text-base leading-relaxed shadow-inner resize-none transition-all custom-scrollbar" 
                  />

                  {/* Hashtags Section */}
                  {selectedVariation.suggestedHashtags && (
                    <div className="flex flex-col gap-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                      <div className="flex items-center gap-2">
                        <Wand size={14} className="text-purple-600" />
                        <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Hashtags מומלצים</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const allTags = new Set<string>();
                          selectedPlatforms.forEach(platform => {
                            const h = platform === 'facebook' ? selectedVariation.suggestedHashtags?.facebook :
                                      platform === 'instagram' ? selectedVariation.suggestedHashtags?.instagram :
                                      platform === 'linkedin' ? selectedVariation.suggestedHashtags?.linkedin :
                                      selectedVariation.suggestedHashtags?.general;
                            h?.forEach(tag => allTags.add(tag.startsWith('#') ? tag : `#${tag}`));
                          });
                          if (selectedVariation.suggestedHashtags?.general) {
                            selectedVariation.suggestedHashtags.general.forEach(tag => allTags.add(tag.startsWith('#') ? tag : `#${tag}`));
                          }
                          return Array.from(allTags).map((tag, i) => (
                            <button
                              key={i}
                              onClick={() => setEditableContent(prev => `${prev}\n${tag}`)}
                              className="px-3 py-1.5 bg-white text-purple-700 rounded-lg text-xs font-bold border-2 border-purple-200 hover:bg-purple-100 hover:border-purple-400 transition-all"
                              title="לחץ להוספה לתוכן"
                            >
                              {tag}
                            </button>
                          ));
                        })()}
                      </div>
                      <p className="text-[10px] text-purple-600 font-medium">💡 לחץ על hashtag להוספה אוטומטית לתוכן</p>
                    </div>
                  )}

                  {/* Best Posting Time */}
                  {postingTimes && postingTimes.bestTimes.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <div className="flex items-center gap-3">
                        <Clock size={18} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">שעה מומלצת לפרסום</span>
                          <span className="text-sm font-bold text-indigo-900">
                            {postingTimes.bestTimes[0].dayHebrew} ב-{postingTimes.bestTimes[0].hourDisplay}
                          </span>
                          <span className="text-[10px] text-indigo-600">{postingTimes.bestTimes[0].reason}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowTimesModal(true)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                      >
                        עוד המלצות
                      </button>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-4 p-5 md:p-6 bg-slate-50/50 rounded-2xl border border-slate-200 mt-2">
                    <div className="flex items-center gap-3">
                      <Wand className="text-indigo-600" size={20}/>
                      <span className="font-bold text-sm text-slate-800">ויז׳ואל AI משלים</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-slate-600">גודל תמונה</span>
                      <div className="flex gap-2">
                        {([
                          { label: '1:1', value: '1024x1024' as const, desc: 'ריבועי' },
                          { label: '16:9', value: '1792x1024' as const, desc: 'רוחבי' },
                          { label: '9:16', value: '1024x1792' as const, desc: 'סטורי' },
                        ]).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setImageSize(opt.value)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                              imageSize === opt.value 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-bold">{opt.label}</div>
                            <div className="text-[9px] opacity-80">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={handleGenerateImage} 
                      disabled={isGeneratingImage}
                      className="w-full py-2.5 md:py-3 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingImage ? <Skeleton className="w-3.5 h-3.5 rounded-full bg-indigo-200" /> : <Sparkles size={14}/>}
                      {selectedVariation.generatedImage ? 'ייצר תמונה חדשה' : 'ייצר תמונה'}
                    </button>
                    {selectedVariation.generatedImage && (
                      <div className="mt-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-indigo-700">תמונה שנוצרה</span>
                          <button 
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = selectedVariation.generatedImage!;
                              a.download = `ai-image-${Date.now()}.png`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            }} 
                            className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                          >
                            הורד תמונה
                          </button>
                        </div>
                        <img 
                          src={selectedVariation.generatedImage} 
                          className="w-full rounded-xl border border-slate-200 shadow-sm" 
                          alt="AI Generated" 
                        />
                      </div>
                    )}
                    <p className="text-[10px] font-medium text-slate-500 leading-relaxed text-center">
                      ה-AI ייצר תמונה מותאמת אישית לתוכן הפוסט בגודל שנבחר.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleFinalize} 
                    className="w-full py-4 md:py-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg md:text-xl rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all"
                  >
                    שגר לאוויר 🚀
                  </button>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleSaveToContentBank}
                      className="flex-1 py-3 bg-white text-slate-700 font-bold text-sm rounded-xl border border-slate-200 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <BookmarkPlus size={16} className="text-slate-400" /> לבנק תכנים
                    </button>
                    <button 
                      onClick={() => setShowScheduleInput(!showScheduleInput)}
                      className={`flex-1 py-3 font-bold text-sm rounded-xl border shadow-sm flex items-center justify-center gap-2 transition-all ${
                        showScheduleInput ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CalendarPlus size={16} className={showScheduleInput ? "text-indigo-500" : "text-slate-400"} /> תזמן
                    </button>
                  </div>
                  {showScheduleInput && (
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3 md:p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in slide-in-from-top">
                      <input 
                        type="datetime-local" 
                        value={scheduledDate}
                        onChange={e => setScheduledDate(e.target.value)}
                        className="flex-1 p-2.5 border border-indigo-200 rounded-lg font-bold text-sm bg-white outline-none focus:ring-2 ring-indigo-500/20 text-slate-700"
                        dir="ltr"
                      />
                      <button 
                        onClick={handleSchedulePost}
                        disabled={!scheduledDate}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                      >
                        <Check size={14}/> אשר
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Posting Times Modal */}
      {showTimesModal && postingTimes && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTimesModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white border-b border-slate-100 p-5 md:p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                  <Clock size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">שעות פרסום מומלצות</h3>
                  <p className="text-xs text-slate-500 font-medium">מבוסס על מעורבות קהל</p>
                </div>
              </div>
              <button onClick={() => setShowTimesModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {/* Best Times */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">זמנים מעולים (Top 6)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {postingTimes.bestTimes.slice(0, 6).map((time, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-lg flex flex-col items-center justify-center leading-none">
                          <span className="text-[10px] font-medium opacity-80 mb-0.5">ציון</span>
                          <span className="font-bold text-sm">{time.score}</span>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800">{time.dayHebrew} ב-{time.hourDisplay}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={time.reason}>{time.reason}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors" title={time.platform}>
                        {React.createElement(PLATFORM_ICONS[time.platform as SocialPlatform] || Globe, { size: 14 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avoid Times */}
              {postingTimes.avoidTimes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">שעות חלשות (להימנע)</h4>
                  <div className="flex flex-wrap gap-2">
                    {postingTimes.avoidTimes.map((time, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-full border border-rose-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        <span className="text-xs font-medium text-rose-700">{time.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Tip */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <Sparkles size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-xs font-medium text-slate-600 leading-relaxed">{postingTimes.generalTip}</p>
              </div>
            </div>
            
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                <p className="text-[10px] font-medium text-slate-400">
                  מקור הנתונים: {postingTimes.dataSource === 'industry_best_practices' ? 'סטטיסטיקות גלובליות וניתוח שוק' : 'היסטוריית הביצועים של הלקוח'}
                </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

