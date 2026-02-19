'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Upload, Star, GripVertical, Image, Video, FileImage } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  imageUrl?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  sortOrder?: number;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  videoUrl?: string;
  coverImageUrl?: string;
  sortOrder?: number;
}

export default function LandingContentClient() {
  const [activeTab, setActiveTab] = useState<'testimonials' | 'faq'>('testimonials');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);

  useEffect(() => {
    loadTestimonials();
    loadFAQs();
  }, []);

  const loadTestimonials = async () => {
    try {
      const res = await fetch('/api/landing/testimonials');
      const data = await res.json();
      setTestimonials(data.testimonials || []);
    } catch (error) {
      console.error('Error loading testimonials:', error);
    }
  };

  const loadFAQs = async () => {
    try {
      const res = await fetch('/api/landing/faq');
      const data = await res.json();
      setFaqs(data.faqs || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
    }
  };

  const saveTestimonial = async (testimonial: Testimonial, action: 'create' | 'update') => {
    try {
      const res = await fetch('/api/landing/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, testimonial }),
      });
      if (res.ok) {
        loadTestimonials();
        alert(action === 'create' ? 'המלצה נוספה' : 'המלצה עודכנה');
      }
    } catch (error) {
      console.error('Error saving testimonial:', error);
      alert('שגיאה בשמירה');
    }
  };

  const saveFAQ = async (faq: FAQItem, action: 'create' | 'update') => {
    try {
      const res = await fetch('/api/landing/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, faq }),
      });
      if (res.ok) {
        loadFAQs();
        alert(action === 'create' ? 'שאלה נוספה' : 'שאלה עודכנה');
      }
    } catch (error) {
      console.error('Error saving FAQ:', error);
      alert('שגיאה בשמירה');
    }
  };

  const addTestimonial = () => {
    const newTestimonial: Testimonial = {
      id: 'temp-' + Date.now(),
      name: 'שם חדש',
      role: 'תפקיד',
      company: 'חברה',
      content: 'תוכן ההמלצה...',
      rating: 5,
      sortOrder: testimonials.length,
    };
    setTestimonials([...testimonials, newTestimonial]);
  };

  const addFAQ = () => {
    const newFAQ: FAQItem = {
      id: 'temp-' + Date.now(),
      question: 'שאלה חדשה?',
      answer: 'תשובה...',
      sortOrder: faqs.length,
    };
    setFaqs([...faqs, newFAQ]);
  };

  const deleteTestimonial = async (id: string) => {
    if (!confirm('בטוח למחוק?')) return;
    
    if (id.startsWith('temp-')) {
      setTestimonials(testimonials.filter(t => t.id !== id));
      return;
    }

    try {
      const res = await fetch('/api/landing/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', testimonial: { id } }),
      });
      if (res.ok) {
        loadTestimonials();
        alert('נמחק בהצלחה');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const deleteFAQ = async (id: string) => {
    if (!confirm('בטוח למחוק?')) return;
    
    if (id.startsWith('temp-')) {
      setFaqs(faqs.filter(f => f.id !== id));
      return;
    }

    try {
      const res = await fetch('/api/landing/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', faq: { id } }),
      });
      if (res.ok) {
        loadFAQs();
        alert('נמחק בהצלחה');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const updateTestimonial = (id: string, field: keyof Testimonial, value: unknown) => {
    setTestimonials(
      testimonials.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      )
    );
  };

  const updateFAQ = (id: string, field: keyof FAQItem, value: string) => {
    setFaqs(
      faqs.map((f) =>
        f.id === id ? { ...f, [field]: value } : f
      )
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    if (activeTab === 'testimonials') {
      const items = [...testimonials];
      const draggedItem = items[draggedIndex];
      items.splice(draggedIndex, 1);
      items.splice(index, 0, draggedItem);
      setTestimonials(items);
      setDraggedIndex(index);
    } else {
      const items = [...faqs];
      const draggedItem = items[draggedIndex];
      items.splice(draggedIndex, 1);
      items.splice(index, 0, draggedItem);
      setFaqs(items);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    
    setDraggedIndex(null);
    
    if (activeTab === 'testimonials') {
      const updated = testimonials.map((t, i) => ({ ...t, sortOrder: i }));
      try {
        await fetch('/api/landing/testimonials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reorder', testimonials: updated }),
        });
      } catch (error) {
        console.error('Error reordering:', error);
      }
    } else {
      const updated = faqs.map((f, i) => ({ ...f, sortOrder: i }));
      try {
        await fetch('/api/landing/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reorder', faqs: updated }),
        });
      } catch (error) {
        console.error('Error reordering:', error);
      }
    }
  };

  const handleMediaUpload = async (
    itemId: string,
    file: File,
    type: 'image' | 'video' | 'cover',
    itemType: 'testimonial' | 'faq'
  ) => {
    setUploadingImageFor(itemId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/landing/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const fieldName = type === 'image' ? 'imageUrl' : type === 'video' ? 'videoUrl' : 'coverImageUrl';
        
        if (itemType === 'testimonial') {
          updateTestimonial(itemId, fieldName as keyof Testimonial, data.url);
        } else {
          updateFAQ(itemId, fieldName as keyof FAQItem, data.url);
        }
        
        const typeLabel = type === 'image' ? 'תמונה' : type === 'video' ? 'סרטון' : 'תמונת כאבר';
        alert(`${typeLabel} הועלה בהצלחה`);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      alert('שגיאה בהעלאה');
    } finally {
      setUploadingImageFor(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">ניהול תוכן דף נחיתה</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 sm:mt-2">עריכת המלצות ושאלות נפוצות - גרירה לשינוי סדר</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('testimonials')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold transition-colors ${
                activeTab === 'testimonials'
                  ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              המלצות לקוחות
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold transition-colors ${
                activeTab === 'faq'
                  ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              שאלות נפוצות
            </button>
          </div>

          <div className="p-3 sm:p-6">
            {activeTab === 'testimonials' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    {testimonials.length} המלצות
                  </h2>
                  <button
                    onClick={addTestimonial}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={18} />
                    הוסף המלצה
                  </button>
                </div>

                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className="bg-slate-50 rounded-xl p-6 border border-slate-200 cursor-move hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <GripVertical size={20} className="text-slate-400 mt-2 flex-shrink-0" />
                      
                      <div className="flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                          <input
                            type="text"
                            value={testimonial.name}
                            onChange={(e) =>
                              updateTestimonial(testimonial.id, 'name', e.target.value)
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-300"
                            placeholder="שם"
                          />
                          <input
                            type="text"
                            value={testimonial.role}
                            onChange={(e) =>
                              updateTestimonial(testimonial.id, 'role', e.target.value)
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-300"
                            placeholder="תפקיד"
                          />
                          <input
                            type="text"
                            value={testimonial.company}
                            onChange={(e) =>
                              updateTestimonial(testimonial.id, 'company', e.target.value)
                            }
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-300"
                            placeholder="חברה"
                          />
                        </div>

                        <textarea
                          value={testimonial.content}
                          onChange={(e) =>
                            updateTestimonial(testimonial.id, 'content', e.target.value)
                          }
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-300 mb-4"
                          placeholder="תוכן ההמלצה..."
                        />

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-700">דירוג:</span>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() =>
                                  updateTestimonial(testimonial.id, 'rating', rating)
                                }
                              >
                                <Star
                                  size={20}
                                  className={`${
                                    rating <= testimonial.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="file"
                              id={`image-${testimonial.id}`}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMediaUpload(testimonial.id, file, 'image', 'testimonial');
                              }}
                            />
                            <input
                              type="file"
                              id={`video-${testimonial.id}`}
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMediaUpload(testimonial.id, file, 'video', 'testimonial');
                              }}
                            />
                            <input
                              type="file"
                              id={`cover-${testimonial.id}`}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMediaUpload(testimonial.id, file, 'cover', 'testimonial');
                              }}
                            />
                            
                            <button
                              onClick={() => document.getElementById(`image-${testimonial.id}`)?.click()}
                              disabled={uploadingImageFor === testimonial.id}
                              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-bold"
                            >
                              {uploadingImageFor === testimonial.id ? (
                                <>מעלה...</>
                              ) : (
                                <>
                                  <Image size={16} />
                                  תמונה
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => document.getElementById(`video-${testimonial.id}`)?.click()}
                              disabled={uploadingImageFor === testimonial.id}
                              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-bold"
                            >
                              <Video size={16} />
                              סרטון
                            </button>

                            <button
                              onClick={() => document.getElementById(`cover-${testimonial.id}`)?.click()}
                              disabled={uploadingImageFor === testimonial.id}
                              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-bold"
                            >
                              <FileImage size={16} />
                              כאבר
                            </button>

                            {testimonial.imageUrl && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded text-xs">
                                <Image size={14} className="text-emerald-600" />
                                <span className="text-emerald-600">תמונה ✓</span>
                              </div>
                            )}
                            {testimonial.videoUrl && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs">
                                <Video size={14} className="text-blue-600" />
                                <span className="text-blue-600">סרטון ✓</span>
                              </div>
                            )}
                            {testimonial.coverImageUrl && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded text-xs">
                                <FileImage size={14} className="text-purple-600" />
                                <span className="text-purple-600">כאבר ✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => saveTestimonial(testimonial, testimonial.id.startsWith('temp-') ? 'create' : 'update')}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={() => deleteTestimonial(testimonial.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {testimonials.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    אין המלצות. לחץ "הוסף המלצה" כדי להתחיל.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    {faqs.length} שאלות ותשובות
                  </h2>
                  <button
                    onClick={addFAQ}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={18} />
                    הוסף שאלה
                  </button>
                </div>

                {faqs.map((faq, index) => (
                  <div
                    key={faq.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className="bg-slate-50 rounded-xl p-6 border border-slate-200 cursor-move hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <GripVertical size={20} className="text-slate-400 mt-2 flex-shrink-0" />
                      
                      <div className="flex-1">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) =>
                            updateFAQ(faq.id, 'question', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-300 mb-4"
                          placeholder="השאלה..."
                        />

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            תשובה
                          </label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) =>
                              updateFAQ(faq.id, 'answer', e.target.value)
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-300 mb-4"
                            placeholder="התשובה..."
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="file"
                              id={`faq-video-${faq.id}`}
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMediaUpload(faq.id, file, 'video', 'faq');
                              }}
                            />
                            <input
                              type="file"
                              id={`faq-cover-${faq.id}`}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMediaUpload(faq.id, file, 'cover', 'faq');
                              }}
                            />
                            
                            <button
                              onClick={() => document.getElementById(`faq-video-${faq.id}`)?.click()}
                              disabled={uploadingImageFor === faq.id}
                              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-bold"
                            >
                              <Video size={16} />
                              הוסף סרטון
                            </button>

                            <button
                              onClick={() => document.getElementById(`faq-cover-${faq.id}`)?.click()}
                              disabled={uploadingImageFor === faq.id}
                              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-bold"
                            >
                              <FileImage size={16} />
                              תמונת כאבר
                            </button>

                            {faq.videoUrl && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs">
                                <Video size={14} className="text-blue-600" />
                                <span className="text-blue-600">סרטון ✓</span>
                              </div>
                            )}
                            {faq.coverImageUrl && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded text-xs">
                                <FileImage size={14} className="text-purple-600" />
                                <span className="text-purple-600">כאבר ✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => saveFAQ(faq, faq.id.startsWith('temp-') ? 'create' : 'update')}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={() => deleteFAQ(faq.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {faqs.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    אין שאלות. לחץ "הוסף שאלה" כדי להתחיל.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
