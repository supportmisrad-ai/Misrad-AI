'use client';

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Image, Upload, Plus, Trash2, Sparkles, FileText,
  Search, Filter, FolderOpen, Tag, Copy, ArrowRight, X,
  Video, Layout, BookOpen, Lightbulb, Palette, Hash
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useParams } from 'next/navigation';

interface ContentItem {
  id: string;
  type: 'image' | 'video' | 'template' | 'idea';
  title: string;
  description?: string;
  tags: string[];
  createdAt: string;
  thumbnail?: string;
  category: string;
}

interface Template {
  id: string;
  title: string;
  body: string;
  platform: string;
  tags: string[];
}

const CATEGORIES = [
  { id: 'all', label: 'הכל', icon: FolderOpen },
  { id: 'media', label: 'ספריית מדיה', icon: Image },
  { id: 'ideas', label: 'בנק רעיונות', icon: Lightbulb },
  { id: 'templates', label: 'תבניות פוסטים', icon: FileText },
  { id: 'hashtags', label: 'האשטגים', icon: Hash },
];

const SAMPLE_TEMPLATES: Template[] = [
  { id: 't1', title: 'פוסט הכרות', body: 'שלום! אנחנו {שם_הארגון} ואנחנו עוסקים ב...', platform: 'facebook', tags: ['הכרות', 'ברוכים הבאים'] },
  { id: 't2', title: 'טיפ מקצועי', body: '💡 טיפ מהיר: {תוכן_הטיפ}\n\nמה אתם חושבים? שתפו אותנו בתגובות 👇', platform: 'instagram', tags: ['טיפ', 'ערך'] },
  { id: 't3', title: 'מבצע / הנחה', body: '🔥 {שם_המבצע}\n\n{פירוט_המבצע}\n\n⏰ בתוקף עד {תאריך}\n\n👉 לפרטים נוספים: {קישור}', platform: 'facebook', tags: ['מבצע', 'מכירות'] },
  { id: 't4', title: 'סיפור לקוח', body: '⭐ "{ציטוט_הלקוח}"\n\n— {שם_הלקוח}\n\nתודה על האמון! 🙏', platform: 'instagram', tags: ['עדות', 'לקוח'] },
  { id: 't5', title: 'מאחורי הקלעים', body: '📸 הצצה מאחורי הקלעים...\n\n{תיאור}\n\n#מאחוריהקלעים #{תחום}', platform: 'instagram', tags: ['מאחורי הקלעים', 'אותנטי'] },
];

export default function ContentBank() {
  const { addToast } = useApp();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Array<{ id: string; url: string; name: string; type: string }>>([]);
  const [ideas, setIdeas] = useState<Array<{ id: string; text: string; tags: string[]; createdAt: string }>>([]);
  const [newIdeaText, setNewIdeaText] = useState('');
  const [hashtagSets, setHashtagSets] = useState<Array<{ id: string; name: string; tags: string[] }>>([
    { id: 'h1', name: 'עסקי כללי', tags: ['עסקים', 'יזמות', 'קריירה', 'הצלחה', 'מוטיבציה'] },
    { id: 'h2', name: 'מדיה חברתית', tags: ['סושיאל', 'שיווק', 'דיגיטל', 'תוכן', 'מותג'] },
    { id: 'h3', name: 'טיפים וערך', tags: ['טיפ', 'מדריך', 'ידע', 'למידה', 'השראה'] },
  ]);
  const [newHashtagSetName, setNewHashtagSetName] = useState('');
  const [newHashtagSetTags, setNewHashtagSetTags] = useState('');
  const [showAddHashtagForm, setShowAddHashtagForm] = useState(false);
  const [nextIdeaId, setNextIdeaId] = useState(1);

  const handleAddIdea = () => {
    if (!newIdeaText.trim()) return;
    const newIdea = {
      id: `idea_${nextIdeaId}`,
      text: newIdeaText,
      tags: [],
      createdAt: new Date().toLocaleDateString('he-IL'),
    };
    setIdeas(prev => [newIdea, ...prev]);
    setNextIdeaId(prev => prev + 1);
    setNewIdeaText('');
    addToast('רעיון נוסף לבנק! 💡');
  };

  const handleDeleteIdea = (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const handleCopyTemplate = (template: Template) => {
    navigator.clipboard.writeText(template.body);
    addToast('תבנית הועתקה! 📋');
  };

  const handleAddHashtagSet = () => {
    if (!newHashtagSetName.trim() || !newHashtagSetTags.trim()) return;
    const tags = newHashtagSetTags.split(',').map(t => t.trim().replace('#', '')).filter(Boolean);
    setHashtagSets(prev => [...prev, { id: `h_${Date.now()}`, name: newHashtagSetName, tags }]);
    setNewHashtagSetName('');
    setNewHashtagSetTags('');
    setShowAddHashtagForm(false);
    addToast('סט האשטגים נוסף!');
  };

  const handleCopyHashtags = (tags: string[]) => {
    navigator.clipboard.writeText(tags.map(t => `#${t}`).join(' '));
    addToast('האשטגים הועתקו! #️⃣');
  };

  const handleDeleteHashtagSet = (id: string) => {
    setHashtagSets(prev => prev.filter(h => h.id !== id));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !orgSlug) return;

    setUploadingFile(true);
    try {
      // Step 1: Get signed upload URL from server
      const urlRes = await fetch('/api/storage/media-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          folder: 'media',
        }),
      });

      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData.signedUrl) {
        addToast(urlData.error || 'שגיאה בהכנת העלאה', 'error');
        return;
      }

      // Step 2: Upload file directly to Supabase (bypasses Vercel 4.5MB limit)
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        addToast('שגיאה בהעלאת הקובץ', 'error');
        return;
      }

      const newFile = {
        id: `media_${Date.now()}`,
        url: `sb://media/${urlData.path}`,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
      };
      setMediaFiles(prev => [newFile, ...prev]);
      addToast('הקובץ הועלה בהצלחה! ✅');
    } catch (error) {
      addToast('שגיאה בהעלאת הקובץ', 'error');
    } finally {
      setUploadingFile(false);
      if (event.target) event.target.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-10 pb-20 animate-in fade-in" dir="rtl">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 md:p-12 rounded-3xl md:rounded-[48px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_70%)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-3 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="p-2.5 bg-indigo-500/30 rounded-2xl border border-indigo-400/30">
                <Database size={20} className="text-indigo-300" />
              </div>
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">בנק תכנים</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">מרכז התכנים של הארגון</h1>
            <p className="text-sm text-slate-300 font-bold leading-relaxed max-w-lg">
              כל המדיה, הרעיונות, התבניות וההאשטגים במקום אחד. ארגון חכם = תוכן עקבי.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 border border-white/20 p-4 rounded-2xl text-center backdrop-blur-sm">
              <Image size={20} className="text-blue-300 mx-auto mb-1" />
              <p className="text-2xl font-black">0</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">קבצי מדיה</p>
            </div>
            <div className="bg-white/10 border border-white/20 p-4 rounded-2xl text-center backdrop-blur-sm">
              <Lightbulb size={20} className="text-amber-300 mx-auto mb-1" />
              <p className="text-2xl font-black">{ideas.length}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">רעיונות</p>
            </div>
            <div className="bg-white/10 border border-white/20 p-4 rounded-2xl text-center backdrop-blur-sm">
              <FileText size={20} className="text-emerald-300 mx-auto mb-1" />
              <p className="text-2xl font-black">{SAMPLE_TEMPLATES.length}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">תבניות</p>
            </div>
            <div className="bg-white/10 border border-white/20 p-4 rounded-2xl text-center backdrop-blur-sm">
              <Hash size={20} className="text-purple-300 mx-auto mb-1" />
              <p className="text-2xl font-black">{hashtagSets.length}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">סטים</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs + Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto scroll-smooth w-full md:w-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs transition-all whitespace-nowrap ${
                activeCategory === cat.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <cat.icon size={15} /> {cat.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חפש תוכן..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-11 pl-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
          />
        </div>
      </div>

      {/* Media Library */}
      {(activeCategory === 'all' || activeCategory === 'media') && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white p-8 md:p-10 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Image size={22} /></div>
                <div>
                  <h2 className="text-xl font-black">ספריית מדיה</h2>
                  <p className="text-xs font-bold text-slate-400">תמונות, וידאו וקבצים גרפיים</p>
                </div>
              </div>
              <button 
                onClick={triggerFileUpload}
                disabled={uploadingFile}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
              >
                <Upload size={15} /> {uploadingFile ? 'מעלה...' : 'העלה קובץ'}
              </button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mediaFiles.length === 0 ? (
                <div className="bg-slate-50/50 p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[200px]">
                  <Image size={48} className="text-slate-200 mb-4" />
                  <p className="text-sm font-black text-slate-400 mb-1">אין קבצים עדיין</p>
                  <p className="text-xs font-bold text-slate-300">העלה קבצים כדי להתחיל</p>
                </div>
              ) : (
                mediaFiles.map(file => (
                  <div key={file.id} className="aspect-square rounded-3xl border border-slate-200 overflow-hidden relative group">
                    {file.type === 'image' ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : file.type === 'video' ? (
                      <video src={file.url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <FileText size={32} className="text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <button onClick={() => window.open(file.url, '_blank')} className="p-2 bg-white rounded-lg text-slate-900 hover:bg-slate-100">
                        <ArrowRight size={16} />
                      </button>
                      <button onClick={() => setMediaFiles(prev => prev.filter(f => f.id !== file.id))} className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <button 
                onClick={triggerFileUpload}
                disabled={uploadingFile}
                className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-500 transition-all gap-2 disabled:opacity-50"
              >
                <Upload size={32} />
                <span className="text-[10px] font-black uppercase">{uploadingFile ? 'מעלה...' : 'העלאת קובץ'}</span>
              </button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Ideas Bank */}
      {(activeCategory === 'all' || activeCategory === 'ideas') && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-white p-8 md:p-10 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Lightbulb size={22} /></div>
                <div>
                  <h2 className="text-xl font-black">בנק רעיונות</h2>
                  <p className="text-xs font-bold text-slate-400">רעיונות לפוסטים, קמפיינים ותוכן</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/50 p-6 rounded-[28px] border border-amber-100 mb-6">
              <textarea
                value={newIdeaText}
                onChange={e => setNewIdeaText(e.target.value)}
                placeholder="רעיון חדש? כתוב פה... 💡"
                className="w-full bg-transparent outline-none font-bold text-sm resize-none h-20 text-amber-900 placeholder:text-amber-300"
              />
              <button
                onClick={handleAddIdea}
                disabled={!newIdeaText.trim()}
                className="w-full py-3 bg-amber-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-200 mt-2 hover:bg-amber-600 transition-all disabled:opacity-40"
              >
                שמור בבנק 💡
              </button>
            </div>

            {ideas.length === 0 ? (
              <div className="bg-slate-50 p-10 rounded-[28px] border border-slate-200 text-center">
                <Lightbulb size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-black text-slate-400">אין רעיונות עדיין</p>
                <p className="text-xs font-bold text-slate-300 mt-1">כתוב רעיון למעלה והוא יישמר כאן</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {ideas.map(idea => (
                  <motion.div
                    key={idea.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-yellow-50 rounded-[22px] border border-yellow-100 shadow-sm group"
                  >
                    <p className="font-bold text-slate-800 text-sm leading-relaxed mb-3">&quot;{idea.text}&quot;</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-300 uppercase">{idea.createdAt}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteIdea(idea.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(idea.text);
                            addToast('הועתק! 📋');
                          }}
                          className="p-2 text-slate-300 hover:text-blue-500 transition-all"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* Templates */}
      {(activeCategory === 'all' || activeCategory === 'templates') && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-white p-8 md:p-10 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><FileText size={22} /></div>
                <div>
                  <h2 className="text-xl font-black">תבניות פוסטים</h2>
                  <p className="text-xs font-bold text-slate-400">תבניות מוכנות לשימוש — פשוט החלף מילים</p>
                </div>
              </div>
              <button 
                onClick={() => addToast('יצירת תבניות עם AI תהיה זמינה בקרוב ✨', 'info')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <Sparkles size={15} /> צור תבניות עם AI
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SAMPLE_TEMPLATES.map(template => (
                <div key={template.id} className="p-6 bg-slate-50 rounded-[28px] border border-slate-200 hover:shadow-md transition-all group flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-slate-800">{template.title}</h3>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase">{template.platform}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed flex-1 whitespace-pre-wrap mb-4">{template.body}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {template.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">{tag}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleCopyTemplate(template)}
                      className="p-2 text-slate-300 hover:text-emerald-600 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Hashtag Sets */}
      {(activeCategory === 'all' || activeCategory === 'hashtags') && (
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="bg-white p-8 md:p-10 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Hash size={22} /></div>
                <div>
                  <h2 className="text-xl font-black">סטים של האשטגים</h2>
                  <p className="text-xs font-bold text-slate-400">קבוצות האשטגים מוכנות להעתקה</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => addToast('יצירת האשטגים עם AI תהיה זמינה בקרוב ✨', 'info')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  <Sparkles size={15} /> צור עם AI
                </button>
                <button
                  onClick={() => setShowAddHashtagForm(!showAddHashtagForm)}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                >
                  {showAddHashtagForm ? <X size={15} /> : <Plus size={15} />}
                  {showAddHashtagForm ? 'ביטול' : 'סט ידני'}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showAddHashtagForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-purple-50/50 p-6 rounded-[28px] border border-purple-100 mb-6 overflow-hidden"
                >
                  <input
                    type="text"
                    placeholder="שם הסט (למשל: נדל&quot;ן)"
                    value={newHashtagSetName}
                    onChange={e => setNewHashtagSetName(e.target.value)}
                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-purple-100 mb-3"
                  />
                  <input
                    type="text"
                    placeholder="האשטגים מופרדים בפסיקים: נדלן, השקעות, דירה..."
                    value={newHashtagSetTags}
                    onChange={e => setNewHashtagSetTags(e.target.value)}
                    className="w-full bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border border-purple-100 mb-3"
                  />
                  <button
                    onClick={handleAddHashtagSet}
                    disabled={!newHashtagSetName.trim() || !newHashtagSetTags.trim()}
                    className="w-full py-3 bg-purple-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-200 disabled:opacity-40"
                  >
                    הוסף סט #️⃣
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hashtagSets.map(set => (
                <div key={set.id} className="p-6 bg-slate-50 rounded-[28px] border border-slate-200 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800">{set.name}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleDeleteHashtagSet(set.id)} className="p-1.5 text-slate-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                      <button onClick={() => handleCopyHashtags(set.tags)} className="p-1.5 text-slate-300 hover:text-purple-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {set.tags.map(tag => (
                      <span key={tag} className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg">#{tag}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleCopyHashtags(set.tags)}
                    className="w-full mt-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={13} /> העתק הכל
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}
    </div>
  );
}
