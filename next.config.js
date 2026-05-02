/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Uploads are served from /public/uploads — no external domains needed by default
  },
  // Allow large file uploads (default limit is 4 MB for API routes)
  experimental: {
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
};

module.exports = nextConfig;
