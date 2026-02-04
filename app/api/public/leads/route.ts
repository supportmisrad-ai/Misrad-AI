import { NextRequest } from 'next/server';
import prisma, { executeRawAllowlisted, queryRawAllowlisted } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const VALID_SOURCES = ['landing-page', 'contact-form', 'demo-request', 'pricing-page', 'webinar', 'other'] as const;
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

type LeadInput = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  message?: string;
  orgSlug: string;
};

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return cleaned.length >= 9 && cleaned.length <= 15;
}

async function checkRateLimit(apiKey: string, maxRequests: number): Promise<boolean> {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const key = `rate_limit:${apiKey}:${Math.floor(now / windowMs)}`;
  
  try {
    // Clean old entries first
    await executeRawAllowlisted(prisma, {
      reason: 'api_rate_limit_cleanup',
      query: `DELETE FROM api_rate_limits WHERE expires_at < NOW()`,
      values: []
    });
    
    // Try to get current count
    const existing = await queryRawAllowlisted<Array<{ count: number }>>(prisma, {
      reason: 'api_rate_limit_check',
      query: `SELECT count FROM api_rate_limits WHERE key = $1`,
      values: [key]
    });

    if (existing.length > 0) {
      const currentCount = existing[0].count;
      
      if (currentCount >= maxRequests) {
        return false;
      }

      await executeRawAllowlisted(prisma, {
        reason: 'api_rate_limit_incr',
        query: `UPDATE api_rate_limits SET count = count + 1 WHERE key = $1`,
        values: [key]
      });
    } else {
      await executeRawAllowlisted(prisma, {
        reason: 'api_rate_limit_insert',
        query: `INSERT INTO api_rate_limits (key, count, expires_at)
         VALUES ($1, 1, NOW() + INTERVAL '2 minutes')`,
        values: [key]
      });
    }

    return true;
  } catch (error) {
    console.error('[Rate Limit] Error:', error);
    return true; // Fail open
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.nextUrl.searchParams.get('key') || req.headers.get('x-api-key');

    if (!apiKey || !apiKey.trim()) {
      return apiError('Missing API key. Provide ?key=YOUR_KEY or X-API-Key header', { status: 401 });
    }

    // Use raw SQL with proper escaping since api_keys is not in Prisma schema
    const validKey = await queryRawAllowlisted<Array<{ 
      id: string; 
      is_active: boolean; 
      rate_limit_per_minute: number;
      allowed_endpoints: string[];
    }>>(prisma, {
      reason: 'api_key_check',
      query: `SELECT id, is_active, rate_limit_per_minute, allowed_endpoints
       FROM api_keys 
       WHERE key = $1 AND is_active = true`,
      values: [apiKey]
    });

    if (!validKey || validKey.length === 0) {
      return apiError('Invalid API key', { status: 401 });
    }

    const keyData = validKey[0];
    
    // Check if endpoint is allowed
    if (!keyData.allowed_endpoints.includes('public_leads')) {
      return apiError('API key not authorized for this endpoint', { status: 403 });
    }

    // Update last used timestamp
    await executeRawAllowlisted(prisma, {
      reason: 'api_key_usage',
      query: `UPDATE api_keys SET last_used_at = NOW() WHERE key = $1`,
      values: [apiKey]
    });

    const withinLimit = await checkRateLimit(apiKey, keyData.rate_limit_per_minute);
    if (!withinLimit) {
      return apiError(`Rate limit exceeded. Max ${keyData.rate_limit_per_minute} requests per minute`, { status: 429 });
    }

    const body = await req.json() as LeadInput;

    if (!body.name?.trim()) {
      return apiError('name is required', { status: 400 });
    }

    if (!body.email?.trim()) {
      return apiError('email is required', { status: 400 });
    }

    if (!validateEmail(body.email)) {
      return apiError('Invalid email format', { status: 400 });
    }

    if (!body.orgSlug?.trim()) {
      return apiError('orgSlug is required', { status: 400 });
    }

    if (body.phone && !validatePhone(body.phone)) {
      return apiError('Invalid phone format', { status: 400 });
    }

    const org = await prisma.social_organizations.findFirst({
      where: {
        OR: [
          { slug: body.orgSlug },
          { id: body.orgSlug },
        ],
      },
      select: { id: true, name: true },
    });

    if (!org) {
      return apiError('Organization not found', { status: 404 });
    }

    const source = body.source && VALID_SOURCES.includes(body.source as any)
      ? body.source
      : 'landing-page';

    const lead = await prisma.systemLead.create({
      data: {
        organizationId: org.id,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || '',
        company: body.company?.trim() || null,
        source,
        status: 'new',
        score: 50,
        lastContact: new Date(),
        isHot: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    if (body.message?.trim()) {
      await prisma.systemLeadActivity.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          type: 'note',
          content: `Message from landing page: ${body.message.trim()}`,
          timestamp: new Date(),
        },
      });
    }

    return apiSuccess({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      status: lead.status,
      createdAt: lead.createdAt,
      message: 'Lead created successfully',
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('[Public Leads API] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return apiError(message, { status: 500 });
  }
}

export async function GET() {
  return apiError('Method not allowed. Use POST to submit leads', { status: 405 });
}
