import { getUpstashRedisClient } from '@/lib/server/upstashRedis';

export type EmployeeInviteEmailJob = {
  invitationId: string;
  organizationId: string;
  toEmail: string;
  employeeName: string | null;
  department: string;
  role: string;
  invitationUrl: string;
  createdByName: string | null;
  attempts?: number;
};

const QUEUE_KEY = 'q:employee_invite_emails';

export function getEmployeeInviteEmailQueueKey(): string {
  return QUEUE_KEY;
}

export async function enqueueEmployeeInviteEmail(job: EmployeeInviteEmailJob): Promise<{ queued: boolean; error?: string }> {
  const redis = getUpstashRedisClient();
  if (!redis) {
    return { queued: false, error: 'Redis not configured' };
  }

  const payload: EmployeeInviteEmailJob = {
    ...job,
    attempts: typeof job.attempts === 'number' ? job.attempts : 0,
  };

  try {
    await redis.lpush(QUEUE_KEY, JSON.stringify(payload));
    return { queued: true };
  } catch (e: any) {
    return { queued: false, error: e?.message || 'Failed to enqueue' };
  }
}
