'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { updateNavigationMenu } from '@/app/actions/admin-navigation';
import { Button } from '@/components/ui/button';

interface NavigationTabProps {
  navigationItems: any[];
  setNavigationItems: (items: any[]) => void;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function NavigationTab({ navigationItems, setNavigationItems, onRefresh, addToast }: NavigationTabProps) {
  return (
    <motion.div key="navigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">תפריט ניווט</h3>
            <p className="text-sm text-slate-600">ערוך את פריטי התפריט, סדר, נראות והרשאות</p>
          </div>
          <Button
            onClick={async () => {
              const result = await updateNavigationMenu(navigationItems);
              if (result.success) {
                addToast('תפריט עודכן בהצלחה', 'success');
                onRefresh();
              } else {
                addToast(result.error || 'שגיאה בשמירת תפריט', 'error');
              }
            }}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-xl font-black text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"
          >
            שמור שינויים
          </Button>
        </div>
        <div className="p-10">
          <div className="flex flex-col gap-6">
            {['global', 'client', 'management', 'settings', 'admin'].map((section) => {
              const sectionItems = navigationItems.filter((item: any) => item.section === section).sort((a: any, b: any) => a.order - b.order);
              const sectionLabels: Record<string, string> = {
                global: 'כללי',
                client: 'לקוח',
                management: 'ניהול',
                settings: 'הגדרות',
                admin: 'מערכת',
              };
              
              return (
                <div key={section} className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                  <h4 className="text-xl font-black text-slate-900 mb-6">{sectionLabels[section]}</h4>
                  <div className="flex flex-col gap-4">
                    {sectionItems.length > 0 ? (
                      sectionItems.map((item: any, idx: number) => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4">
                          <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => {
                                  setNavigationItems(
                                    navigationItems.map((i: any) => i.id === item.id ? { ...i, label: e.target.value } : i)
                                  );
                                }}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black outline-none focus:border-indigo-400"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={item.icon}
                                onChange={(e) => {
                                  setNavigationItems(
                                    navigationItems.map((i: any) => i.id === item.id ? { ...i, icon: e.target.value } : i)
                                  );
                                }}
                                placeholder="Icon name"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm outline-none focus:border-indigo-400"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={item.view}
                                onChange={(e) => {
                                  setNavigationItems(
                                    navigationItems.map((i: any) => i.id === item.id ? { ...i, view: e.target.value } : i)
                                  );
                                }}
                                placeholder="View type"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm outline-none focus:border-indigo-400"
                              />
                            </div>
                            <div className="col-span-1">
                              <input
                                type="number"
                                value={item.order}
                                onChange={(e) => {
                                  setNavigationItems(
                                    navigationItems.map((i: any) => i.id === item.id ? { ...i, order: Number(e.target.value) } : i)
                                  );
                                }}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black text-center outline-none focus:border-indigo-400"
                              />
                            </div>
                            <div className="col-span-2 flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.isVisible}
                                  onChange={(e) => {
                                    setNavigationItems(
                                      navigationItems.map((i: any) => i.id === item.id ? { ...i, isVisible: e.target.checked } : i)
                                    );
                                  }}
                                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-slate-700">נראה</span>
                              </label>
                              {section === 'client' && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.requiresClient || false}
                                    onChange={(e) => {
                                      setNavigationItems(
                                        navigationItems.map((i: any) => i.id === item.id ? { ...i, requiresClient: e.target.checked } : i)
                                      );
                                    }}
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="text-sm font-bold text-slate-700">דורש לקוח</span>
                                </label>
                              )}
                            </div>
                            <div className="col-span-2">
                              <Button
                                onClick={() => {
                                  if (confirm('האם אתה בטוח שברצונך למחוק פריט זה?')) {
                                    setNavigationItems(navigationItems.filter((i: any) => i.id !== item.id));
                                  }
                                }}
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 bg-rose-100 text-rose-700 border-rose-100 hover:bg-rose-500 hover:text-white"
                                aria-label="מחק פריט"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 font-bold text-center py-4">אין פריטים בקטגוריה זו</p>
                    )}
                    <Button
                      onClick={() => {
                        const newId = `nav-${Date.now()}`;
                        setNavigationItems([
                          ...navigationItems,
                          {
                            id: newId,
                            label: 'פריט חדש',
                            icon: 'Home',
                            view: 'dashboard',
                            section,
                            order: sectionItems.length + 1,
                            isVisible: true,
                            requiresClient: section === 'client',
                          },
                        ]);
                      }}
                      variant="outline"
                      className="mt-2 h-auto p-4 bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-700 font-black hover:bg-indigo-100"
                    >
                      + הוסף פריט חדש
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

