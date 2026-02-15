import { NextRequest } from 'next/server';
import prisma, { queryRawAllowlisted } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { buildRateLimitHeaders, getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';
import { asObject } from '@/lib/server/workspace-access/utils';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

const IS_PROD = process.env.NODE_ENV === 'production';

const VALID_SOURCES = ['landing-page', 'contact-form', 'demo-request', 'pricing-page', 'webinar', 'other'] as const;

type LeadInput = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  message?: string;
  orgSlug: string;
};

function isValidSource(value: string): value is (typeof VALID_SOURCES)[number] {
  return (VALID_SOURCES as readonly string[]).includes(value);
}

type RateLimitCheckResult =
  | { ok: true }
  | { ok: false; status: 429; message: string; retryAfterSeconds: number }
  | { ok: false; status: 503; message: string; retryAfterSeconds: number };

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return cleaned.length >= 9 && cleaned.length <= 15;
}

async function checkRateLimit(params: { req: NextRequest; apiKey: string; maxRequests: number }): Promise<RateLimitCheckResult> {
  const ip = getClientIpFromRequest(params.req);
  const key = `${ip}:${params.apiKey}:public.leads`;

  const rl = await rateLimit({
    namespace: 'public.leads',
    key,
    limit: params.maxRequests,
    windowMs: 60 * 1000,
    mode: 'fail_closed',
    unavailableRetryAfterSeconds: 3,
  });

  if (rl.ok) return { ok: true };

  return {
    ok: false,
    status: rl.reason === 'unavailable' ? 503 : 429,
    message: rl.reason === 'unavailable' ? 'Rate limiting temporarily unavailable' : `Rate limit exceeded. Max ${params.maxRequests} requests per minute`,
    retryAfterSeconds: rl.retryAfterSeconds,
  };
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

    const rateLimitResult = await checkRateLimit({ req, apiKey, maxRequests: keyData.rate_limit_per_minute });
    if (!rateLimitResult.ok) {
      return apiError(rateLimitResult.message, {
        status: rateLimitResult.status,
        headers: buildRateLimitHeaders({
          limit: keyData.rate_limit_per_minute,
          remaining: 0,
          resetAt: Date.now() + rateLimitResult.retryAfterSeconds * 1000,
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        }),
      });
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const bodyObj = asObject(rawBody);
    const body: LeadInput = {
      name: String(bodyObj?.name ?? ''),
      email: String(bodyObj?.email ?? ''),
      phone: bodyObj?.phone == null ? undefined : String(bodyObj.phone),
      company: bodyObj?.company == null ? undefined : String(bodyObj.company),
      source: bodyObj?.source == null ? undefined : String(bodyObj.source),
      message: bodyObj?.message == null ? undefined : String(bodyObj.message),
      orgSlug: String(bodyObj?.orgSlug ?? ''),
    };

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

    const org = await prisma.organization.findFirst({
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

    const source = body.source && isValidSource(body.source)
      ? body.source
      : 'landing-page';

    return await withTenantIsolationContext(
      { source: 'api_public_leads', organizationId: org.id, reason: 'create_public_lead' },
      async () => {
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
        }, {
          status: 201,
          headers: buildRateLimitHeaders({
            limit: keyData.rate_limit_per_minute,
            remaining: Math.max(0, keyData.rate_limit_per_minute - 1),
            resetAt: Date.now() + 60 * 1000,
          }),
        });
      }
    );

  } catch (error: unknown) {
    if (IS_PROD) console.error('[Public Leads API] Error');
    else console.error('[Public Leads API] Error:', error);
    const safeMsg = 'Internal server error';
    const message = error instanceof Error ? error.message : safeMsg;
    return apiError(IS_PROD ? safeMsg : message, { status: 500 });
  }
}

export async function GET() {
  return apiError('Method not allowed. Use POST to submit leads', { status: 405 });
}
