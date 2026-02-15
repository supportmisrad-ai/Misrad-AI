import type { ToastType } from '@/contexts/ToastContext';

export type DateLike = string | number | Date;

export type CommunicationActivityType = 'whatsapp' | 'sms' | 'email' | 'note' | 'call' | string;

export interface CommunicationActivity {
  id: string;
  type: CommunicationActivityType;
  content: string;
  timestamp: DateLike;
  direction?: 'outbound' | 'inbound' | string;
  metadata?: unknown;
}

export interface CommunicationLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  status: string;
  value?: number;
  createdAt: DateLike;
  isHot?: boolean;
  activities: CommunicationActivity[];
  productInterest?: string;
  [key: string]: unknown;
}

export interface CommunicationTask {
  id: string;
  title: string;
  assigneeId?: string;
  dueDate?: DateLike;
  priority?: unknown;
  status?: unknown;
  tags?: unknown;
  [key: string]: unknown;
}

export type AddToastFn = (message: string, type?: ToastType) => void;

export type UseToastHook = () => { addToast: AddToastFn };

export interface QuickAsset {
  id: string;
  label: string;
  value: string;
}

export interface Stage {
  id: string;
  label: string;
  accent?: string;
}

export type UseOnClickOutsideHook = (
  ref: React.RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void
) => void;

export type AIDraftFn = (ctx: {
  activeLead: CommunicationLead;
  selectedSendChannel: 'whatsapp' | 'sms' | 'email';
}) => Promise<string | null>;

export type CallButtonComponent = React.ComponentType<{
  phoneNumber: string;
  size?: string;
  variant?: string;
  className?: string;
  user?: unknown;
  onToast?: AddToastFn;
  onCallInitiated?: (phone: string) => void;
}>;

export type ChannelFilter = 'all' | 'whatsapp' | 'sms' | 'email';
export type SendChannel = 'whatsapp' | 'sms' | 'email';

export interface ChatListItem {
  id: string;
  name: string;
  company?: string;
  avatar: string;
  source: string;
  lastMsg: string;
  time: string;
  timestamp: number;
  unread: number;
  color: string;
}

export interface ActiveMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  type: CommunicationActivityType;
  subject?: string;
  metadata?: unknown;
}

export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
