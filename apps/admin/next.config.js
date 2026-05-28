/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@clockwork/shared'],
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
