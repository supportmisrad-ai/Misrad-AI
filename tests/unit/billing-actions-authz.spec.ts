import { test, expect } from '@playwright/test';

import path from 'node:path';
import Module from 'node:module';

const repoRoot = path.resolve(__dirname, '..', '..');

const cjsRequire = Module.createRequire(__filename);

const billingActionsPath = path.join(repoRoot, 'app', 'actions', 'billing-actions.ts');
const authPath = path.join(repoRoot, 'lib', 'auth.ts');
const errorHandlerPath = path.join(repoRoot, 'lib', 'errorHandler.ts');
const prismaPath = path.join(repoRoot, 'lib', 'prisma.ts');

function clearModule(specifier: string) {
  try {
    const resolved = cjsRequire.resolve(specifier);
    delete cjsRequire.cache[resolved];
  } catch {
  }
}

function mockModule(absolutePath: string, exports: unknown) {
  const resolved = cjsRequire.resolve(absolutePath);
  const m = new Module(resolved, module);
  m.filename = resolved;
  m.loaded = true;
  m.exports = exports;
  cjsRequire.cache[resolved] = m;
  return resolved;
}

test.describe('billing-actions authz', () => {
  test('non-super-admin returns ok:false and does not touch prisma', async () => {
    process.env.DATABASE_URL ||= 'postgresql://user:pass@localhost:5432/misrad_test?schema=public';
    process.env.DIRECT_URL ||= process.env.DATABASE_URL;

    clearModule(billingActionsPath);
    clearModule(authPath);
    clearModule(errorHandlerPath);
    clearModule(prismaPath);

    try {
      let prismaTouched = false;

      const prismaMock = {
        social_organizations: {
          update: async () => {
            prismaTouched = true;
            throw new Error('Unexpected prisma access: social_organizations.update');
          },
          findUnique: async () => {
            prismaTouched = true;
            throw new Error('Unexpected prisma access: social_organizations.findUnique');
          },
        },
        coupons: {
          findUnique: async () => {
            prismaTouched = true;
            throw new Error('Unexpected prisma access: coupons.findUnique');
          },
        },
        coupon_redemptions: {
          findFirst: async () => {
            prismaTouched = true;
            throw new Error('Unexpected prisma access: coupon_redemptions.findFirst');
          },
          create: async () => {
            prismaTouched = true;
            throw new Error('Unexpected prisma access: coupon_redemptions.create');
          },
        },
      };

      mockModule(prismaPath, { default: prismaMock });
      mockModule(errorHandlerPath, {
        requireAuth: async () => {
          return { success: true, data: { userId: 'user_1' }, userId: 'user_1' };
        },
      });
      mockModule(authPath, {
        getAuthenticatedUser: async () => {
          return { id: 'user_1', role: 'עובד', isSuperAdmin: false };
        },
        requireSuperAdmin: async () => {
          throw new Error('Forbidden - Super Admin required');
        },
      });

      const billingActions = cjsRequire(billingActionsPath);

      prismaTouched = false;
      const r1 = await billingActions.updateOrganizationBilling('org_1', { seats_allowed: 10 });
      expect(r1).toMatchObject({ ok: false });
      expect(String(r1.error || '')).toContain('אין הרשאה');
      expect(prismaTouched).toBe(false);

      prismaTouched = false;
      const r2 = await billingActions.validateCoupon('TEST');
      expect(r2).toMatchObject({ ok: false });
      expect(String(r2.error || '')).toContain('אין הרשאה');
      expect(prismaTouched).toBe(false);

      prismaTouched = false;
      const r3 = await billingActions.applyCouponToOrganization('org_1', 'TEST');
      expect(r3).toMatchObject({ ok: false });
      expect(String(r3.error || '')).toContain('אין הרשאה');
      expect(prismaTouched).toBe(false);

      prismaTouched = false;
      const r4 = await billingActions.removeCouponFromOrganization('org_1');
      expect(r4).toMatchObject({ ok: false });
      expect(String(r4.error || '')).toContain('אין הרשאה');
      expect(prismaTouched).toBe(false);
    } finally {
      clearModule(authPath);
      clearModule(errorHandlerPath);
      clearModule(prismaPath);
      clearModule(billingActionsPath);
    }
  });
});
