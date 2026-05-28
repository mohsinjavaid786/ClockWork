/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { domains: [] },
  transpilePackages: ['@trackdesk/shared'],
};

module.exports = nextConfig;
