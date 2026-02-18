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
      { protocol: 'https', hostname: 'i.pravatar.cc', pathname: '/**' },
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
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash', '@radix-ui/react-icons']
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

    // Development optimizations for faster builds
    if (dev) {
      // Speed up development builds
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
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

