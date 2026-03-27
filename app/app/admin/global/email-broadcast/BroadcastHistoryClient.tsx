'use client';

/**
 * Broadcast History Client - Admin UI for viewing email broadcast history and stats
 * Ultra-perfectionist implementation for MISRAD AI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  Users,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  listBroadcastEmails,
  getBroadcastDetail,
  deleteBroadcastEmail,
  cancelBroadcastEmail,
  getBroadcastStats,
} from '@/app/actions/email-broadcast';
import type {
  BroadcastListItem,
  BroadcastDetail,
  BroadcastStats,
} from '@/types/email-broadcast';

// ═══════════════════════════════════════════════════════════════════════════════
// Status Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const statusConfig = {
  DRAFT: { label: 'טיוטה', color: 'bg-slate-100 text-slate-700', icon: Clock },
  SCHEDULED: { label: 'מתוזמן', color: 'bg-blue-100 text-blue-700', icon: Clock },
  SENDING: { label: 'נשלח...', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  SENT: { label: 'נשלח', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  FAILED: { label: 'נכשל', color: 'bg-rose-100 text-rose-700', icon: XCircle },
  CANCELLED: { label: 'בוטל', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

const legalCategoryConfig = {
  marketing: { label: 'שיווק', color: 'bg-purple-100 text-purple-700' },
  legal: { label: 'משפטי', color: 'bg-indigo-100 text-indigo-700' },
  system: { label: 'מערכת', color: 'bg-slate-100 text-slate-700' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function BroadcastHistoryClient() {
  const { addToast } = useData();
  
  // State
  const [broadcasts, setBroadcasts] = useState<BroadcastListItem[]>([]);
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Load Data
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    const [listResult, statsResult] = await Promise.all([
      listBroadcastEmails(),
      getBroadcastStats(),
    ]);
    
    if (listResult.success && listResult.broadcasts) {
      setBroadcasts(listResult.broadcasts);
    } else if (listResult.error) {
      addToast(listResult.error, 'error');
    }
    
    if (statsResult.success && statsResult.stats) {
      setStats(statsResult.stats);
    }
    
    setIsLoading(false);
  }, [addToast]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleViewDetail = async (id: string) => {
    setIsDetailLoading(true);
    setIsDetailOpen(true);
    
    const result = await getBroadcastDetail(id);
    if (result.success && result.broadcast) {
      setSelectedBroadcast(result.broadcast);
    } else {
      addToast(result.error || 'שגיאה בטעינת פרטים', 'error');
    }
    
    setIsDetailLoading(false);
  };
  
  const handleCancel = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך לבטל את המייל המתוזמן?')) return;
    
    const result = await cancelBroadcastEmail(id);
    if (result.success) {
      addToast('המייל בוטל בהצלחה', 'success');
      loadData();
    } else {
      addToast(result.error || 'שגיאה בביטול', 'error');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המייל? פעולה זו אינה הפיכה.')) return;
    
    const result = await deleteBroadcastEmail(id);
    if (result.success) {
      addToast('המייל נמחק בהצלחה', 'success');
      loadData();
    } else {
      addToast(result.error || 'שגיאה במחיקה', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">היסטוריית מיילים</h2>
          <p className="text-slate-500">צפה בכל המיילים שנשלחו מהמערכת</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">סה"כ מיילים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">נשלחו</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{stats.byStatus.SENT || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">טיוטות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-600">{stats.byStatus.DRAFT || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">מתוזמנים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.byStatus.SCHEDULED || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Broadcasts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            רשימת מיילים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Mail className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>אין מיילים בהיסטוריה</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">נושא</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">קטגוריה</TableHead>
                  <TableHead className="text-right">נמענים</TableHead>
                  <TableHead className="text-right">נשלח</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((broadcast) => {
                  const status = statusConfig[broadcast.status];
                  const category = legalCategoryConfig[broadcast.legalCategory as keyof typeof legalCategoryConfig] || 
                    { label: broadcast.legalCategory, color: 'bg-slate-100' };
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={broadcast.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {broadcast.subject}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} gap-1`}>
                          <StatusIcon className={`h-3 w-3 ${broadcast.status === 'SENDING' ? 'animate-spin' : ''}`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={category.color}>
                          {category.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>{broadcast.targetCount}</span>
                          {broadcast.sentCount > 0 && (
                            <span className="text-slate-400 text-xs">
                              ({broadcast.sentCount} נשלח)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {broadcast.status === 'SENT' && (
                          <div className="text-xs">
                            <div className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {Math.round((broadcast.openedCount / broadcast.sentCount) * 100)}% נפתחו
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(broadcast.createdAt).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewDetail(broadcast.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {broadcast.status === 'SCHEDULED' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleCancel(broadcast.id)}
                            >
                              <XCircle className="h-4 w-4 text-amber-500" />
                            </Button>
                          )}
                          
                          {(broadcast.status === 'DRAFT' || broadcast.status === 'SCHEDULED' || broadcast.status === 'CANCELLED') && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDelete(broadcast.id)}
                            >
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי מייל</DialogTitle>
          </DialogHeader>
          
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedBroadcast ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">נושא</p>
                  <p className="font-medium">{selectedBroadcast.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">סטטוס</p>
                  <Badge className={statusConfig[selectedBroadcast.status].color}>
                    {statusConfig[selectedBroadcast.status].label}
                  </Badge>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{selectedBroadcast.targetCount}</div>
                  <div className="text-xs text-slate-500">יעד</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{selectedBroadcast.sentCount}</div>
                  <div className="text-xs text-emerald-600">נשלח</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedBroadcast.openedCount}</div>
                  <div className="text-xs text-blue-600">נפתח</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedBroadcast.clickedCount}</div>
                  <div className="text-xs text-purple-600">נלחץ</div>
                </div>
              </div>
              
              {/* HTML Preview */}
              <div>
                <p className="text-sm text-slate-500 mb-2">תצוגת HTML</p>
                <div 
                  className="border rounded-lg p-4 bg-white max-h-64 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedBroadcast.bodyHtml }}
                />
              </div>
              
              {/* Recipients */}
              {selectedBroadcast.recipients && selectedBroadcast.recipients.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">
                    נמענים ({selectedBroadcast.recipients.length} ראשונים)
                  </p>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-right">מייל</th>
                          <th className="px-3 py-2 text-right">סטטוס</th>
                          <th className="px-3 py-2 text-right">נשלח</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBroadcast.recipients.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs">{r.userEmail}</td>
                            <td className="px-3 py-2">
                              <Badge 
                                className={
                                  r.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' :
                                  r.status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                                  r.status === 'SKIPPED' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-700'
                                }
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {r.sentAt ? new Date(r.sentAt).toLocaleString('he-IL') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
