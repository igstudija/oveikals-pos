/** @type {import('next').NextConfig} */
const nextConfig = {
  // Home page at "/", slideshow at "/pos", admin at "/pos/admin" — built with
  // the app/ folder structure (no basePath), so the root domain works on Vercel
  // without any redirect.
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
};

module.exports = nextConfig;
