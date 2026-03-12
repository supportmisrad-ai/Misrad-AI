'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BotLeadDTO, GetBotLeadsParams, getBotLeads, updateBotLeadStatus, updateBotLeadAssignment } from '@/app/actions/bot-leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Phone, 
  Mail, 
  Building2, 
  Tag, 
  MessageSquare, 
  Calendar,
  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  User,
  ArrowUpDown,
  Star,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  negotiation: { label: 'במשא ומתן', color: 'bg-amber-500', icon: ArrowUpDown },
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
      toast.error('שגיאה בטעינת לידים');
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
      toast.success('סטטוס עודכן בהצלחה');
      fetchLeads();
    } catch (error) {
      toast.error('שגיאה בעדכון סטטוס');
    }
  };

  const handleAssignment = async (leadId: string, assignedTo: string | null) => {
    try {
      await updateBotLeadAssignment(leadId, assignedTo);
      toast.success('שיוך עודכן בהצלחה');
      fetchLeads();
    } catch (error) {
      toast.error('שגיאה בשיוך ליד');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.new;
    const Icon = config.icon;
    return (
      <Badge className={cn(config.color, 'text-white')}>
        <Icon className="w-3 h-3 ml-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <Badge variant="outline" className={cn(config.color, 'text-white border-0')}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">לידים מהבוט</h1>
          <p className="text-muted-foreground">
            ניהול לידים מבלאסטר וואטסאפ ({total.toLocaleString()} לידים)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchLeads}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 ml-2', isLoading && 'animate-spin')} />
            רענן
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם, טלפון, אימייל, חברה..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select
              value={filters.priority}
              onValueChange={(value) => setFilters({ ...filters, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="עדיפות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל העדיפויות</SelectItem>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campaign Filter */}
            <Select
              value={filters.campaign}
              onValueChange={(value) => setFilters({ ...filters, campaign: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="קמפיין" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקמפיינים</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign} value={campaign}>
                    {campaign}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ליד</TableHead>
                <TableHead>פרטי קשר</TableHead>
                <TableHead>חברה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>עדיפות</TableHead>
                <TableHead>ציון</TableHead>
                <TableHead>שיחות</TableHead>
                <TableHead>נוצר</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {lead.name || lead.first_name || 'ליד ללא שם'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {lead.phone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                      {lead.alternative_phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {lead.alternative_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.business_name && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{lead.business_name}</span>
                      </div>
                    )}
                    {lead.industry && (
                      <div className="text-sm text-muted-foreground">
                        {lead.industry}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(lead.status)}
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(lead.priority)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className={cn(
                        'w-4 h-4',
                        (lead.lead_score || 0) > 70 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                      )} />
                      <span className="font-medium">{lead.lead_score || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span>{lead.conversation_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(lead.created_at), {
                        addSuffix: true,
                        locale: he,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/bot-leads/${lead.id}`)}
                      >
                        פרטים
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    isActive={page === pageNum}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
