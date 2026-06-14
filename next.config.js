/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/pos';

const nextConfig = {
  // App lives under /pos so the public link is oveikals.lv/pos
  basePath: basePath || undefined,
  // Allow large image uploads through Server Actions / route handlers
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
};

module.exports = nextConfig;
