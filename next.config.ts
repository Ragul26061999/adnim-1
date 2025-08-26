import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  // Increase timeouts to prevent 502 errors
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  // Configure the server
  serverRuntimeConfig: {
    // Increase the API timeout to 60 seconds
    apiTimeout: 60000,
  },
  // Configure the public runtime config
  publicRuntimeConfig: {
    // Add any public config variables here
  },
  // Configure images if needed
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Configure webpack
  webpack: (config, { isServer }) => {
    // Important: return the modified config
    if (!isServer) {
      // Exclude firebase-admin from client-side bundles
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        dgram: false,
      };
    }
    return config;
  },
};

export default nextConfig;
