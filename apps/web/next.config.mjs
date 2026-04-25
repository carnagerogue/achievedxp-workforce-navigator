/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dxp/shared'],
  // standalone produces a self-contained .next/standalone tree we can copy
  // into a slim runtime image — far smaller than shipping all node_modules.
  output: 'standalone',
};

export default nextConfig;
