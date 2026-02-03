import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  cleanDistDir: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.pravatar.cc', pathname: '/**' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/nexus/app',
        destination: '/app',
        permanent: false,
      },
      {
        source: '/nexus/app/:path*',
        destination: '/app/:path*',
        permanent: false,
      },
      {
        source: '/client-os',
        destination: '/login?redirect=/client-os',
        permanent: false,
      },
      {
        source: '/client-os/:path*',
        destination: '/login?redirect=/client-os/:path*',
        permanent: false,
      },
      {
        source: '/finance-os',
        destination: '/login?redirect=/finance-os',
        permanent: false,
      },
      {
        source: '/finance-os/:path*',
        destination: '/login?redirect=/finance-os/:path*',
        permanent: false,
      },
      {
        source: '/nexus-os',
        destination: '/login?redirect=/nexus-os',
        permanent: false,
      },
      {
        source: '/nexus-os/:path*',
        destination: '/login?redirect=/nexus-os/:path*',
        permanent: false,
      },
      {
        source: '/pipeline',
        destination: '/login?redirect=/pipeline',
        permanent: false,
      },
      {
        source: '/pipeline/:path*',
        destination: '/login?redirect=/pipeline/:path*',
        permanent: false,
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
    }
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
  webpack: (config, { isServer }) => {
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

    if (process.env.NODE_ENV === 'development') {
      return config;
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

