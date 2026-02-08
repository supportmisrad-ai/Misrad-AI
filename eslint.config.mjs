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
    "test-tenant-guard-fix.js",
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
              name: "@/lib/supabase-browser",
              importNames: ["createBrowserClientWithClerk"],
              message:
                "Prisma-First: בדפדפן אסור להשתמש ב-createBrowserClientWithClerk (full client). השתמש ב-createBrowserStorageClientWithClerk כדי להימנע מ-accidental PostgREST (.from/.rpc).",
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
            "Program:has(ImportDeclaration[source.value='@/lib/supabase']) CallExpression[callee.type='MemberExpression'][callee.property.name='from'][callee.object.type='Identifier'][callee.object.name=/^(supabase|supabaseClient|supabaseAdmin|sb)$/]",
          message:
            "Prisma-First: אל תשתמש ישירות ב-supabase.from(...). TODO: Migrate to Prisma.",
        },
        {
          selector:
            "Program:has(ImportDeclaration[source.value='@supabase/supabase-js']) CallExpression[callee.type='MemberExpression'][callee.property.name='from'][callee.object.type='Identifier'][callee.object.name=/^(supabase|supabaseClient|supabaseAdmin|sb)$/]",
          message:
            "Prisma-First: אל תשתמש ישירות ב-supabase.from(...). TODO: Migrate to Prisma.",
        },
        {
          selector: "FunctionDeclaration[id.name='asObject']",
          message: "Utilities: אל תגדיר asObject מקומי. השתמש ב-@/lib/shared/unknown.",
        },
        {
          selector: "FunctionDeclaration[id.name='getErrorMessage']",
          message: "Utilities: אל תגדיר getErrorMessage מקומי. השתמש ב-@/lib/shared/unknown.",
        },
        {
          selector: "FunctionDeclaration[id.name='getUnknownErrorMessage']",
          message: "Utilities: אל תגדיר getUnknownErrorMessage מקומי. השתמש ב-@/lib/shared/unknown.",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  {
    files: ["lib/shared/unknown.ts"],
    rules: {
      "no-restricted-syntax": "off",
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
    files: ["scripts/**/*.{js,cjs,mjs}"],
    languageOptions: {
      sourceType: "script",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["electron/**/*.js"],
    languageOptions: {
      sourceType: "script",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: [
      "app/actions/**/*.{js,jsx,ts,tsx}",
      "app/api/storage/**/*.{js,jsx,ts,tsx}",
      "app/portal/**/*.{js,jsx,ts,tsx}",
      "app/w/**/(modules)/operations/**/*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  {
    files: ["scripts/test-security.ts"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
    },
  },

  {
    files: ["lib/supabase.ts", "lib/supabase-browser.ts", "scripts/**/*.{js,cjs,mjs,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
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

  {
    files: ["tests/e2e/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  {
    files: ["contexts/OSModuleContext.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },

  {
    files: ["electron/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["app/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },

  {
    files: [
      "app/w/\\[orgSlug\\]/(modules)/operations/work-orders/\\[id\\]/page.tsx",
      "app/portal/ops/\\[token\\]/page.tsx",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  {
    files: [
      "app/actions/files.ts",
      "app/actions/nexus.ts",
      "app/actions/client-portal-clinic.ts",
      "app/api/client-os/meetings/process/route.ts",
      "app/api/client-os/meetings/upload-url/route.ts",
      "app/api/storage/upload/route.ts",
      "app/api/webhooks/make/route.ts",
      "app/api/webhooks/zapier/route.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  {
    files: [
      "app/api/webhooks/clerk/route.ts",
      "app/api/webhooks/make/route.ts",
      "app/api/webhooks/zapier/route.ts",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
