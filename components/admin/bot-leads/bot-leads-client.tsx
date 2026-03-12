'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BotLeadDTO, GetBotLeadsParams, getBotLeads, updateBotLeadStatus, updateBotLeadAssignment } from '@/app/actions/bot-leads';
import { 
  Phone, 
  Mail, 
  Building2, 
  MessageSquare, 
  Calendar,
  Search,
  RefreshCw,
  User,
  Star,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';

interface BotLeadsClientProps {
  initialLeads: BotLeadDTO[];
  initialTotal: number;
  campaigns: string[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: 'חדש', color: 'bg-blue-500', icon: AlertCircle },
  contacted: { label: 'נוצר קשר', color: 'bg-yellow-500', icon: Phone },
  qualified: { label: 'מועמד', color: 'bg-purple-500', icon: Star },
  demo_scheduled: { label: 'דמו מתוזמן', color: 'bg-indigo-500', icon: Calendar },
  demo_completed: { label: 'דמו הושלם', color: 'bg-green-500', icon: CheckCircle },
  proposal_sent: { label: 'הצעת מחיר נשלחה', color: 'bg-orange-500', icon: Mail },
  negotiation: { label: 'במשא ומתן', color: 'bg-amber-500', icon: Clock },
  trial: { label: 'בתקופת ניסיון', color: 'bg-cyan-500', icon: Clock },
  customer: { label: 'לקוח', color: 'bg-emerald-500', icon: CheckCircle },
  churned: { label: 'נטש', color: 'bg-red-500', icon: AlertCircle },
  lost: { label: 'אבוד', color: 'bg-gray-500', icon: AlertCircle },
  unsubscribed: { label: 'הסיר הרשמה', color: 'bg-slate-500', icon: AlertCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'נמוך', color: 'bg-gray-400' },
  medium: { label: 'בינוני', color: 'bg-blue-400' },
  high: { label: 'גבוה', color: 'bg-orange-400' },
  urgent: { label: 'דחוף', color: 'bg-red-500' },
};

export function BotLeadsClient({ initialLeads, initialTotal, campaigns }: BotLeadsClientProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<BotLeadDTO[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<GetBotLeadsParams>({
    status: 'all',
    priority: 'all',
    campaign: 'all',
    assignedTo: 'all',
    pageSize: 50,
  });

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getBotLeads({
        ...filters,
        search: search || undefined,
        page,
        pageSize,
      });
      setLeads(result.leads);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, search, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateBotLeadStatus(leadId, newStatus);
      console.log('Status updated successfully');
      fetchLeads();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAssignment = async (leadId: string, assignedTo: string | null) => {
    try {
      await updateBotLeadAssignment(leadId, assignedTo);
      console.log('Assignment updated successfully');
      fetchLeads();
    } catch (error) {
      console.error('Failed to assign lead:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.new;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-white text-sm ${config.color}`}>
        <Icon className="w-3 h-3 ml-1" />
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-white text-sm ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">לידים מהבוט</h1>
          <p className="text-gray-500">
            ניהול לידים מבלאסטר וואטסאפ ({total.toLocaleString()} לידים)
          </p>
        </div>
        <button
          onClick={fetchLeads}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading && 'animate-spin'}`} />
          רענן
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם, טלפון, אימייל, חברה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">כל הסטטוסים</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">כל העדיפויות</option>
            {Object.entries(priorityConfig).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          {/* Campaign Filter */}
          <select
            value={filters.campaign}
            onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">כל הקמפיינים</option>
            {campaigns.map((campaign) => (
              <option key={campaign} value={campaign}>
                {campaign}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">ליד</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">פרטי קשר</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">חברה</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">סטטוס</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">עדיפות</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">ציון</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">שיחות</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">נוצר</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {lead.name || lead.first_name || 'ליד ללא שם'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {lead.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                      {lead.alternative_phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Phone className="w-3 h-3" />
                          {lead.alternative_phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {lead.business_name && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{lead.business_name}</span>
                      </div>
                    )}
                    {lead.industry && (
                      <div className="text-sm text-gray-500">
                        {lead.industry}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(lead.status)}
                  </td>
                  <td className="px-4 py-4">
                    {getPriorityBadge(lead.priority)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Star className={`w-4 h-4 ${(lead.lead_score || 0) > 70 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                      <span className="font-medium">{lead.lead_score || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span>{lead.conversation_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(lead.created_at), {
                        addSuffix: true,
                        locale: he,
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => router.push(`/admin/bot-leads/${lead.id}`)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      פרטים
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            הקודם
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1 rounded ${page === pageNum ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
}
