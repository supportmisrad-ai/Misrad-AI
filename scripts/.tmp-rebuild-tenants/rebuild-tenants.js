"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
function loadEnvLocalOnly() {
    const fullPath = path_1.default.join(process.cwd(), '.env.local');
    if (!fs_1.default.existsSync(fullPath)) {
        throw new Error('[rebuild-tenants] .env.local not found; cannot continue.');
    }
    const parsed = dotenv_1.default.parse(fs_1.default.readFileSync(fullPath));
    for (const [k, v] of Object.entries(parsed))
        process.env[k] = v;
}
function safeSlugCandidate(input) {
    const raw = String(input || '').trim().toLowerCase();
    const cleaned = raw
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    return cleaned || 'org';
}
function makeUniqueSlug(params) {
    const base = safeSlugCandidate(params.base);
    const takenLower = params.taken;
    if (!takenLower.has(base)) {
        takenLower.add(base);
        return base;
    }
    const suffix = String(params.orgId || '').replace(/-/g, '').slice(0, 6).toLowerCase() || 'x';
    const next = `${base}-${suffix}`;
    if (!takenLower.has(next)) {
        takenLower.add(next);
        return next;
    }
    let i = 2;
    while (i < 9999) {
        const cand = `${next}-${i}`;
        if (!takenLower.has(cand)) {
            takenLower.add(cand);
            return cand;
        }
        i += 1;
    }
    throw new Error(`[rebuild-tenants] Failed to allocate unique slug for orgId=${params.orgId}`);
}
async function main() {
    loadEnvLocalOnly();
    const prisma = new client_1.PrismaClient();
    try {
        const orgs = await prisma.social_organizations.findMany({
            select: { id: true, name: true, slug: true, owner_id: true },
            orderBy: { created_at: 'asc' },
        });
        const taken = new Set();
        const existingTenants = await prisma.nexusTenant.findMany({
            select: { subdomain: true },
        });
        for (const t of existingTenants) {
            const sub = safeSlugCandidate(String(t.subdomain || ''));
            if (sub)
                taken.add(sub);
        }
        let created = 0;
        let updated = 0;
        let failed = 0;
        for (const org of orgs) {
            const orgId = String(org.id);
            const orgName = String(org.name || '').trim() || orgId;
            const desiredSlug = String(org.slug || '').trim() || `org-${orgId.replace(/-/g, '').slice(0, 8)}`;
            const subdomain = makeUniqueSlug({ base: desiredSlug, orgId, taken });
            let ownerEmail = '';
            try {
                const owner = await prisma.organizationUser.findUnique({
                    where: { id: String(org.owner_id) },
                    select: { email: true },
                });
                ownerEmail = String(owner?.email || '').trim();
            }
            catch {
                ownerEmail = '';
            }
            if (!ownerEmail) {
                ownerEmail = `admin@${subdomain}.com`;
            }
            try {
                const whereByOrg = { organizationId: orgId };
                const existing = await prisma.nexusTenant.findFirst({
                    where: whereByOrg,
                    select: { id: true },
                });
                if (existing?.id) {
                    await prisma.nexusTenant.update({
                        where: { id: String(existing.id) },
                        data: {
                            name: orgName,
                            subdomain,
                            ownerEmail,
                            plan: 'free',
                            status: 'Active',
                            organizationId: orgId,
                        },
                    });
                    updated += 1;
                }
                else {
                    await prisma.nexusTenant.create({
                        data: {
                            name: orgName,
                            subdomain,
                            ownerEmail,
                            plan: 'free',
                            status: 'Active',
                            organizationId: orgId,
                            modules: [],
                            allowedEmails: [],
                            requireApproval: false,
                        },
                    });
                    created += 1;
                }
            }
            catch (e) {
                failed += 1;
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`[rebuild-tenants] Failed orgId=${orgId} slug=${subdomain}: ${msg}`);
            }
        }
        const count = await prisma.nexusTenant.count();
        console.log(JSON.stringify({
            organizations: orgs.length,
            tenants_total: count,
            created,
            updated,
            failed,
        }, null, 2));
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[rebuild-tenants] Fatal: ${msg}`);
    process.exitCode = 1;
});
