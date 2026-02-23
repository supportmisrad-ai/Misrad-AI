'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, TrendingUp, UserPlus, Clock, Phone, Mail, Building2, Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';

type BotLeadStatus = 'new' | 'qualified' | 'demo_booked' | 'trial' | 'customer' | 'churned' | 'unsubscribed';

interface BotLead {
  id: string;
  phone: string;
  name: string | null;
  business_name: string | null;
  email: string | null;
  industry: string | null;
  org_size: string | null;
  pain_point: string | null;
  selected_plan: string | null;
  source: string | null;
  status: BotLeadStatus;
  score: number;
  last_interaction: string;
  created_at: string;
  _count?: { conversations: number };
}

interface BotConversation {
  id: string;
  direction: string;
  message: string;
  rule_id: string | null;
  variables: Record<string, unknown> | null;
  created_at: string;
}

interface DashboardStats {
  totalLeads: number;
  newToday: number;
  demosBooked: number;
  trials: number;
  customers: number;
  conversationsToday: number;
}

const STATUS_LABELS: Record<BotLeadStatus, { label: string; color: string }> = {
  new: { label: 'חדש', color: 'bg-blue-100 text-blue-800' },
  qualified: { label: 'מסווג', color: 'bg-yellow-100 text-yellow-800' },
  demo_booked: { label: 'דמו נקבע', color: 'bg-purple-100 text-purple-800' },
  trial: { label: 'ניסיון', color: 'bg-green-100 text-green-800' },
  customer: { label: 'לקוח', color: 'bg-emerald-100 text-emerald-800' },
  churned: { label: 'נטש', color: 'bg-red-100 text-red-800' },
  unsubscribed: { label: 'הוסר', color: 'bg-gray-100 text-gray-600' },
};

export default function BotDashboardClient() {
  const [leads, setLeads] = useState<BotLead[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BotLeadStatus | 'all'>('all');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [conversations, setConversations] = useState<BotConversation[]>([]);
  const [convoLoading, setConvoLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/bot?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLeads(data.leads ?? []);
      setStats(data.stats ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleConversation = async (leadId: string) => {
    if (expandedLead === leadId) {
      setExpandedLead(null);
      return;
    }
    setExpandedLead(leadId);
    setConvoLoading(true);
    try {
      const res = await fetch(`/api/admin/bot/conversations?leadId=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
      // silent
    } finally {
      setConvoLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">בוט וואטסאפ</h1>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                סה״כ לידים
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                חדשים היום
              </div>
              <p className="text-2xl font-bold mt-1 text-blue-600">{stats.newToday}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                דמואים
              </div>
              <p className="text-2xl font-bold mt-1 text-purple-600">{stats.demosBooked}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                בניסיון
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.trials}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                לקוחות
              </div>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.customers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                שיחות היום
              </div>
              <p className="text-2xl font-bold mt-1">{stats.conversationsToday}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש לפי שם, טלפון, עסק..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'new', 'qualified', 'demo_booked', 'trial', 'customer', 'churned'] as const).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'הכל' : STATUS_LABELS[s].label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">לידים ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">טוען...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">אין לידים עדיין. כשהבוט יתחיל לפעול, הנתונים יופיעו כאן.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right p-3 font-medium">שם</th>
                    <th className="text-right p-3 font-medium">טלפון</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">עסק</th>
                    <th className="text-right p-3 font-medium hidden lg:table-cell">תעשייה</th>
                    <th className="text-right p-3 font-medium">סטטוס</th>
                    <th className="text-right p-3 font-medium hidden md:table-cell">ציון</th>
                    <th className="text-right p-3 font-medium hidden lg:table-cell">אינטראקציה אחרונה</th>
                    <th className="text-right p-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <tr
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => toggleConversation(lead.id)}
                      >
                        <td className="p-3 font-medium">{lead.name ?? '—'}</td>
                        <td className="p-3 font-mono text-xs" dir="ltr">{lead.phone}</td>
                        <td className="p-3 hidden md:table-cell">{lead.business_name ?? '—'}</td>
                        <td className="p-3 hidden lg:table-cell">{lead.industry ?? '—'}</td>
                        <td className="p-3">
                          <Badge className={`${STATUS_LABELS[lead.status]?.color ?? ''} text-xs`}>
                            {STATUS_LABELS[lead.status]?.label ?? lead.status}
                          </Badge>
                        </td>
                        <td className="p-3 hidden md:table-cell">{lead.score}</td>
                        <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">{formatDate(lead.last_interaction)}</td>
                        <td className="p-3">
                          {expandedLead === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </td>
                      </tr>
                      {expandedLead === lead.id && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="bg-muted/20 border-b p-4">
                              {/* Lead details */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                                {lead.email && (
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{lead.email}</span>
                                  </div>
                                )}
                                {lead.phone && (
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span dir="ltr">{lead.phone}</span>
                                  </div>
                                )}
                                {lead.business_name && (
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{lead.business_name}</span>
                                  </div>
                                )}
                                {lead.org_size && <div><strong>גודל:</strong> {lead.org_size}</div>}
                                {lead.pain_point && <div><strong>צורך:</strong> {lead.pain_point}</div>}
                                {lead.selected_plan && <div><strong>חבילה:</strong> {lead.selected_plan}</div>}
                                {lead.source && <div><strong>מקור:</strong> {lead.source}</div>}
                              </div>
                              {/* Conversations */}
                              <h4 className="text-sm font-semibold mb-2">היסטוריית שיחה</h4>
                              {convoLoading ? (
                                <p className="text-xs text-muted-foreground">טוען שיחות...</p>
                              ) : conversations.length === 0 ? (
                                <p className="text-xs text-muted-foreground">אין שיחות עדיין</p>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {conversations.map((c) => (
                                    <div key={c.id} className={`text-xs p-2 rounded ${c.direction === 'in' ? 'bg-white border' : 'bg-green-50 border border-green-200'}`}>
                                      <div className="flex justify-between mb-1">
                                        <span className="font-medium">{c.direction === 'in' ? '← נכנס' : '→ יוצא'}</span>
                                        <span className="text-muted-foreground">{formatDate(c.created_at)}</span>
                                      </div>
                                      <p className="whitespace-pre-wrap">{c.message}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
