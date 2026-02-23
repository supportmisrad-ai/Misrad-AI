import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  cleanDistDir: true,
  productionBrowserSourceMaps: false,
  compiler: process.env.NODE_ENV === 'production' ? { removeConsole: { exclude: ['error'] } } : undefined,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  async redirects() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/manifests/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/:path*.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://*.googleusercontent.com https://images.unsplash.com",
              "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://*.sentry.io https://*.ingest.sentry.io https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com",
              "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
        ],
      },
    ];
  },
  // Use 'export' for static sites, or remove for server-side rendering
  // output: 'standalone', // Commented out for Netlify compatibility
  // Transpile Supabase to fix ESM import issues
  transpilePackages: ['@supabase/supabase-js'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:4000', 'localhost:5000', 'misrad-ai.com']
    },
    // Modern tree-shaking optimization for icon libraries and UI components
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash', '@radix-ui/react-icons'],
    // Client-side router cache: cache dynamic page responses so soft navigations
    // (Link clicks) reuse the cached RSC payload instead of a full server round-trip.
    // dynamic=30s means clicking back/forth between pages within 30s is instant.
    // static=300s for statically rendered pages.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  // Optimize for Netlify
  compress: true,
  // !! WARN !!
  // Dangerously allow production builds to successfully complete even if
  // your project has type errors.
  // !! WARN !!
  typescript: {
    ignoreBuildErrors: false,
  },
  // Use webpack instead of Turbopack to avoid issues with Hebrew paths
  webpack: (config, { isServer, dev }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false
      };
    }

    // Fix: Remove EvalSourceMapDevToolPlugin for client dev builds.
    // Packages like @clerk/localizations contain template literals and escape
    // sequences that produce broken JavaScript when wrapped in eval("...").
    // Using cheap-module-source-map provides source maps without eval().
    if (dev && !isServer) {
      config.plugins = (config.plugins || []).filter(
        (p: { constructor?: { name?: string } }) =>
          p?.constructor?.name !== 'EvalSourceMapDevToolPlugin'
      );
      config.devtool = 'cheap-module-source-map';
    }

    // Fix for Supabase ESM imports
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.mts'],
    };

    // Fix for Supabase wrapper.mjs ESM import issue
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Ensure proper module resolution for Supabase
    config.module = {
      ...config.module,
      rules: [
        ...(config.module?.rules || []),
        {
          test: /\.mjs$/,
          include: /node_modules\/@supabase/,
          type: 'javascript/auto',
        },
      ],
    };

    if (dev) {
      // Speed up development builds
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
        moduleIds: 'deterministic',
      };
    }

    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
      };
    }

    return config;
  },
};

const sentryOptions = {
  silent: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
} as unknown as Parameters<typeof withSentryConfig>[1];

export default withSentryConfig(nextConfig, sentryOptions);

