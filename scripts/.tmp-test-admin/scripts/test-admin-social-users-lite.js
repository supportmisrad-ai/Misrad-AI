"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const prisma_tenant_guard_1 = require("../lib/prisma-tenant-guard");
function loadEnvLocalOnly() {
    const fullPath = path_1.default.join(process.cwd(), '.env.local');
    if (!fs_1.default.existsSync(fullPath)) {
        throw new Error('[test-admin-social-users-lite] .env.local not found; cannot continue.');
    }
    const parsed = dotenv_1.default.parse(fs_1.default.readFileSync(fullPath));
    for (const [k, v] of Object.entries(parsed))
        process.env[k] = v;
}
async function main() {
    loadEnvLocalOnly();
    const prisma = new client_1.PrismaClient();
    (0, prisma_tenant_guard_1.installPrismaTenantGuard)(prisma);
    try {
        const query = String(process.argv[2] || '').trim();
        const limitArg = Number(process.argv[3] || 50);
        const limit = Number.isFinite(limitArg) ? Math.min(Math.max(limitArg, 1), 500) : 50;
        const data = await (0, prisma_tenant_guard_1.withTenantIsolationContext)({
            suppressReporting: true,
            source: 'test-admin-social-users-lite',
            mode: 'global_admin',
            isSuperAdmin: true,
        }, async () => {
            return await prisma.social_users.findMany((0, prisma_tenant_guard_1.withPrismaTenantIsolationOverride)({
                where: query
                    ? {
                        OR: [
                            { email: { contains: query, mode: 'insensitive' } },
                            { full_name: { contains: query, mode: 'insensitive' } },
                            { clerk_user_id: { contains: query, mode: 'insensitive' } },
                        ],
                    }
                    : undefined,
                select: { id: true, clerk_user_id: true, email: true, full_name: true, role: true, organization_id: true },
                orderBy: { created_at: 'desc' },
                take: limit,
            }, { suppressReporting: true }));
        });
        console.log(JSON.stringify({
            ok: true,
            count: Array.isArray(data) ? data.length : 0,
            sample: Array.isArray(data) && data.length > 0 ? data[0] : null,
        }, null, 2));
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[test-admin-social-users-lite] Failed: ${msg}`);
    process.exitCode = 1;
});
