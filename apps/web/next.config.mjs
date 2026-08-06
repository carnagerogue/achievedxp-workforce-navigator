/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dxp/shared'],
  // standalone produces a self-contained .next/standalone tree we can copy
  // into a slim runtime image — far smaller than shipping all node_modules.
  output: 'standalone',
  // Both gates are live: type errors fail the build (tsc also runs in CI),
  // and ESLint (next/core-web-vitals via .eslintrc.json) fails it too.
};

export default nextConfig;
