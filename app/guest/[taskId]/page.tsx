import type { Metadata } from 'next';

import {
  findNexusTaskByShareToken,
  findNexusTaskByIdPublic,
} from '@/lib/services/nexus-tasks-service';
import { GuestTaskView } from '@/components/GuestTaskView';

interface GuestMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  type?: 'user' | 'system' | 'guest';
}

function sanitizeMessagesForGuest(messages: unknown): GuestMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m: unknown) => {
      if (!m || typeof m !== 'object') return false;
      const msg = m as Record<string, unknown>;
      return typeof msg.text === 'string' && msg.text.length > 0;
    })
    .map((m: unknown) => {
      const msg = m as Record<string, unknown>;
      const type = String(msg.type ?? 'user');
      return {
        id: String(msg.id ?? ''),
        text: String(msg.text ?? ''),
        senderId: type === 'guest' ? 'guest' : 'team',
        createdAt: String(msg.createdAt ?? ''),
        type: type as 'user' | 'system' | 'guest',
      };
    });
}

function getStatusProgress(status: string): number {
  const s = status.toLowerCase();
  if (s === 'backlog') return 0;
  if (s === 'to do' || s === 'todo') return 10;
  if (s === 'in progress' || s === 'in_progress') return 50;
  if (s === 'waiting for review' || s === 'waiting') return 80;
  if (s === 'done') return 100;
  return 0;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'Backlog': return 'בהמתנה';
    case 'To Do':
    case 'Todo': return 'לביצוע';
    case 'In Progress': return 'בתהליך';
    case 'Waiting for Review': return 'ממתין לאישור';
    case 'Done': return 'הושלם';
    case 'Canceled': return 'בוטל';
    default: return status;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ taskId: string }> },
): Promise<Metadata> {
  const { taskId: token } = await params;
  if (!token || token.length < 8) {
    return { title: 'משימה לא נמצאה | MISRAD AI' };
  }
  let row = await findNexusTaskByShareToken(token);
  if (!row) row = await findNexusTaskByIdPublic(token);
  if (!row || row.isPrivate) {
    return { title: 'משימה לא נמצאה | MISRAD AI' };
  }
  return {
    title: `${row.title} | ${row.organization?.name ?? 'MISRAD AI'}`,
    description: row.description ?? 'צפייה בסטטוס משימה',
  };
}

export default async function GuestTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId: token } = await params;

  if (!token || token.length < 8) {
    return <NotFoundView />;
  }

  // Try shareToken first, fall back to task ID (backward compat)
  let row = await findNexusTaskByShareToken(token);
  if (!row) {
    row = await findNexusTaskByIdPublic(token);
  }

  if (!row || row.isPrivate) {
    return <NotFoundView />;
  }

  const messages = sanitizeMessagesForGuest(row.messages);
  const progress = getStatusProgress(row.status);
  const statusLabel = getStatusLabel(row.status);

  const taskData = {
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    statusLabel,
    progress,
    priority: row.priority ?? 'Low',
    createdAt: row.createdAt.toISOString(),
    dueDate: row.dueDate ? row.dueDate.toISOString().split('T')[0] : null,
    approvalStatus: row.approvalStatus ?? null,
    messages,
    tags: row.tags ?? [],
    department: row.department ?? null,
  };

  const orgData = {
    name: row.organization?.name ?? 'MISRAD AI',
    logo: row.organization?.logo ?? null,
  };

  return (
    <GuestTaskView
      token={token}
      task={taskData}
      organization={orgData}
    />
  );
}

function NotFoundView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-3">משימה לא נמצאה</h1>
        <p className="text-gray-500 leading-relaxed">הקישור שקיבלת אינו תקין, המשימה פרטית, או שהמשימה כבר נמחקה.</p>
        <p className="text-sm text-gray-400 mt-4">אנא פנה למנהל הפרויקט לקבלת קישור חדש.</p>
        <a href="https://misrad-ai.com" className="inline-block mt-6 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
          misrad-ai.com
        </a>
      </div>
    </div>
  );
}
