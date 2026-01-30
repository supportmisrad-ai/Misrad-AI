import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "**/build/**",
    "android/**/build/**",
    "next-env.d.ts",
  ]),

  // Prisma-First (Tenant Isolation): soft-block new direct Supabase DB usage.
  // Keep this as "warn" while migrating existing call-sites.
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase-client",
              message:
                "Prisma-First: אל תשתמש ב-@/lib/supabase-client (Supabase singleton). השתמש ב-Prisma או ב-@/lib/supabase רק ל-Auth/Storage/Realtime.",
            },
            {
              name: "@/lib/db",
              message:
                "Prisma-First: אל תוסיף שימוש חדש ב-@/lib/db. שכבה זו נעולה (Tenant Isolation) ומיועדת למיגרציה החוצה.",
            },
            {
              name: "@supabase/supabase-js",
              message:
                "Prisma-First: אל תיצור Supabase client ישירות. השתמש ב-@/lib/supabase (ואסור DB access ישיר דרך .from(...)).",
            },
            {
              name: "@/lib/supabase",
              importNames: ["createServiceRoleClient", "createServiceRoleClientScoped"],
              message:
                "Prisma-First: שימוש ב-Service Role עוקף RLS. מותר רק ב-webhooks/אדמין ובמקרים חריגים. העדף Prisma.",
            },
          ],
          patterns: [
            {
              group: ["**/supabase-client"],
              message:
                "Prisma-First: אל תשתמש ב-supabase-client. השתמש ב-Prisma או ב-@/lib/supabase רק ל-Auth/Storage/Realtime.",
            },
            {
              group: ["**/lib/db"],
              message:
                "Prisma-First: אל תוסיף שימוש חדש ב-lib/db. מיועד למיגרציה החוצה.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Program:has(ImportDeclaration[source.value='@/lib/supabase']) CallExpression[callee.type='MemberExpression'][callee.property.name='from'][callee.object.type='Identifier']",
          message:
            "Prisma-First: אל תשתמש ישירות ב-supabase.from(...). TODO: Migrate to Prisma.",
        },
        {
          selector:
            "Program:has(ImportDeclaration[source.value='@supabase/supabase-js']) CallExpression[callee.type='MemberExpression'][callee.property.name='from'][callee.object.type='Identifier']",
          message:
            "Prisma-First: אל תשתמש ישירות ב-supabase.from(...). TODO: Migrate to Prisma.",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  {
    files: ["app/**/*.{js,jsx,ts,tsx}", "lib/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase",
              importNames: ["createClient"],
              message:
                "Prisma-First: אסור להשתמש ב-createClient (Supabase DB) בקוד עסקי. Supabase מותר רק ל-Storage/infra.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["lib/supabase.ts", "lib/supabase-browser.ts", "scripts/**/*.{js,cjs,mjs,ts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase-client",
              message:
                "Prisma-First: אל תשתמש ב-@/lib/supabase-client (Supabase singleton). השתמש ב-Prisma או ב-@/lib/supabase רק ל-Auth/Storage/Realtime.",
            },
            {
              name: "@/lib/db",
              message:
                "Prisma-First: אל תוסיף שימוש חדש ב-@/lib/db. שכבה זו נעולה (Tenant Isolation) ומיועדת למיגרציה החוצה.",
            },
            {
              name: "@/lib/supabase",
              importNames: ["createServiceRoleClient", "createServiceRoleClientScoped"],
              message:
                "Prisma-First: שימוש ב-Service Role עוקף RLS. מותר רק ב-webhooks/אדמין ובמקרים חריגים. העדף Prisma.",
            },
          ],
          patterns: [
            {
              group: ["**/supabase-client"],
              message:
                "Prisma-First: אל תשתמש ב-supabase-client. השתמש ב-Prisma או ב-@/lib/supabase רק ל-Auth/Storage/Realtime.",
            },
            {
              group: ["**/lib/db"],
              message:
                "Prisma-First: אל תוסיף שימוש חדש ב-lib/db. מיועד למיגרציה החוצה.",
            },
          ],
        },
      ],
    },
  },

  // Allow DB/RLS inspection helpers in e2e routes.
  {
    files: ["app/api/e2e/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
    },
  },

  // E2E tests may legitimately use `any` for Playwright fixtures/helpers.
  {
    files: ["tests/e2e/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
